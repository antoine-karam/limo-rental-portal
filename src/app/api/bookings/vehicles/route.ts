import { prisma } from "@/lib/prisma";
import { calculateVehiclePrice } from "@/server/pricing";
import { RideType } from "@/generated/prisma/client";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    tenantId?: string;
    rideType: RideType;
    distanceKm?: number;
    distanceMiles?: number;
    durationHours?: number;
  };

  const tenantId =
    body.tenantId ?? (await prisma.tenant.findFirst({ where: { active: true }, select: { id: true } }))?.id;

  if (!tenantId) {
    return Response.json({ message: "No active tenant" }, { status: 400 });
  }

  const [vehicles, pricingRules] = await Promise.all([
    prisma.vehicle.findMany({ where: { tenantId, active: true } }),
    prisma.pricingRule.findMany({ where: { tenantId, active: true } }),
  ]);

  const data = vehicles.map((vehicle) => {
    const price = calculateVehiclePrice(vehicle, pricingRules, body.rideType, {
      distanceKm: body.distanceKm ?? 0,
      distanceMiles: body.distanceMiles ?? 0,
      durationHours: body.durationHours ?? 0,
    });

    const amenities = typeof vehicle.amenities === "object" && vehicle.amenities ? Object.keys(vehicle.amenities).filter((key) => Boolean((vehicle.amenities as Record<string, unknown>)[key])) : [];

    return {
      id: vehicle.id,
      name: vehicle.name,
      type: vehicle.type,
      capacity: vehicle.capacity,
      amenities,
      price: price.amount,
      currency: price.currency,
    };
  });

  return Response.json({ tenantId, vehicles: data });
}

import { prisma } from "@/lib/prisma";
import { FleetPreview } from "./models/fleet";
import { buildVehicleDescription, parseAmenities } from "@/lib/helper";

export async function GetFleetPreview(
  tenantId: string | undefined,
): Promise<FleetPreview[]> {
  if (!tenantId) return [];
  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId, active: true },
    select: {
      id: true,
      name: true,
      type: true,
      make: true,
      model: true,
      year: true,
      capacity: true,
      color: true,
      amenities: true,
      photos: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const fleetPreview: FleetPreview[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    name: vehicle.name,
    imageUrl: vehicle.photos?.[0] || null,
    description: buildVehicleDescription(
      vehicle.name,
      vehicle.type,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.capacity,
      vehicle.color,
      parseAmenities(vehicle.amenities),
    ),
  }));
  return fleetPreview;
}

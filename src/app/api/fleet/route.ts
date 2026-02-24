import { prisma } from "@/lib/prisma";
import { VehicleType } from "@/server/models/enums";

function isVehicleType(value: string): value is VehicleType {
  return Object.values(VehicleType).includes(value as VehicleType);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const search = searchParams.get("search")?.trim();

  if (!tenantId || tenantId === "default") {
    return new Response(JSON.stringify({ vehicles: [], total: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const where = {
    tenantId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { make: { contains: search, mode: "insensitive" as const } },
            { model: { contains: search, mode: "insensitive" as const } },
            {
              licensePlate: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    prisma.vehicle.count({ where }),
  ]);

  const payload = vehicles.map((vehicle: any) => ({
    id: vehicle.id,
    name: vehicle.name,
    type: vehicle.type,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    capacity: vehicle.capacity,
    licensePlate: vehicle.licensePlate,
    color: vehicle.color,
    active: vehicle.active,
    photoUrl: vehicle.photos[0] ?? null,
    createdAt: vehicle.createdAt.toISOString(),
  }));

  return new Response(JSON.stringify({ vehicles: payload, total }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.tenantId || body.tenantId === "default") {
    return new Response(JSON.stringify({ error: "Tenant is required." }), {
      status: 400,
    });
  }

  if (!body.name || !isVehicleType(body.type) || !body.capacity) {
    return new Response(JSON.stringify({ error: "Invalid vehicle payload." }), {
      status: 400,
    });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      tenantId: body.tenantId,
      name: body.name,
      type: body.type,
      make: body.make || null,
      model: body.model || null,
      year: body.year ? Number(body.year) : null,
      capacity: Number(body.capacity),
      licensePlate: body.licensePlate || null,
      color: body.color || null,
      active: Boolean(body.active),
      photos: body.photoUrl ? [body.photoUrl] : [],
      amenities: {},
    },
  });

  return new Response(JSON.stringify(vehicle), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();

  if (!body.id || !body.tenantId || body.tenantId === "default") {
    return new Response(JSON.stringify({ error: "Invalid request." }), {
      status: 400,
    });
  }

  if (!body.name || !isVehicleType(body.type) || !body.capacity) {
    return new Response(JSON.stringify({ error: "Invalid vehicle payload." }), {
      status: 400,
    });
  }

  const current = await prisma.vehicle.findUnique({ where: { id: body.id } });

  if (!current || current.tenantId !== body.tenantId) {
    return new Response(JSON.stringify({ error: "Vehicle not found." }), {
      status: 404,
    });
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: body.id },
    data: {
      name: body.name,
      type: body.type,
      make: body.make || null,
      model: body.model || null,
      year: body.year ? Number(body.year) : null,
      capacity: Number(body.capacity),
      licensePlate: body.licensePlate || null,
      color: body.color || null,
      active: Boolean(body.active),
      photos: body.photoUrl ? [body.photoUrl] : [],
    },
  });

  return new Response(JSON.stringify(vehicle), {
    headers: { "Content-Type": "application/json" },
  });
}

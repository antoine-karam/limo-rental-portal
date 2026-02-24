import { prisma } from "@/lib/prisma";
import { DriverStatus } from "@/server/models/enums";

function toRatingNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const maybeDecimal = value as { toNumber: () => number };
    return maybeDecimal.toNumber();
  }
  return 0;
}

function isDriverStatus(value: string): value is DriverStatus {
  return Object.values(DriverStatus).includes(value as DriverStatus);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const search = searchParams.get("search")?.trim();

  if (!tenantId) {
    return new Response(
      JSON.stringify({
        drivers: [],
        total: 0,
        active: 0,
        offDuty: 0,
        avgRating: 0,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const where = {
    tenantId,
    role: "DRIVER" as const,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            {
              driverProfile: {
                is: {
                  licenseNumber: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      driverProfile: {
        select: {
          status: true,
          licenseNumber: true,
          rating: true,
          totalRides: true,
        },
      },
      bookingsAsDriver: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { vehicle: { select: { name: true } } },
      },
    },
  });

  const drivers = users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    licenseNumber: user.driverProfile?.licenseNumber ?? null,
    status: user.driverProfile?.status ?? null,
    rating: toRatingNumber(user.driverProfile?.rating),
    totalRides: user.driverProfile?.totalRides ?? 0,
    vehicleName: user.bookingsAsDriver[0]?.vehicle.name ?? null,
  }));

  const active = drivers.filter(
    (d) => d.status === DriverStatus.AVAILABLE || d.status === DriverStatus.ON_RIDE,
  ).length;
  const offDuty = drivers.filter((d) => d.status === DriverStatus.OFFLINE).length;
  const ratingValues = drivers.map((d) => d.rating).filter((rating) => rating > 0);
  const avgRating = ratingValues.length
    ? ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length
    : 0;

  return new Response(
    JSON.stringify({
      drivers,
      total: drivers.length,
      active,
      offDuty,
      avgRating,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.tenantId || body.tenantId === "default") {
    return new Response(JSON.stringify({ error: "Tenant is required." }), {
      status: 400,
    });
  }

  if (!body.firstName || !body.lastName || !body.email || !isDriverStatus(body.status)) {
    return new Response(JSON.stringify({ error: "Invalid driver payload." }), {
      status: 400,
    });
  }

  const emailExists = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  });

  if (emailExists) {
    return new Response(JSON.stringify({ error: "Email already exists." }), {
      status: 409,
    });
  }

  const userId = crypto.randomUUID();

  const driver = await prisma.user.create({
    data: {
      id: userId,
      tenantId: body.tenantId,
      role: "DRIVER",
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone || null,
      driverProfile: {
        create: {
          tenantId: body.tenantId,
          status: body.status,
          licenseNumber: body.licenseNumber || null,
        },
      },
    },
  });

  return new Response(JSON.stringify(driver), {
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

  if (!body.firstName || !body.lastName || !body.email || !isDriverStatus(body.status)) {
    return new Response(JSON.stringify({ error: "Invalid driver payload." }), {
      status: 400,
    });
  }

  const current = await prisma.user.findUnique({
    where: { id: body.id },
    select: { id: true, tenantId: true, role: true },
  });

  if (!current || current.tenantId !== body.tenantId || current.role !== "DRIVER") {
    return new Response(JSON.stringify({ error: "Driver not found." }), {
      status: 404,
    });
  }

  const duplicateEmail = await prisma.user.findFirst({
    where: {
      email: body.email,
      NOT: { id: body.id },
    },
    select: { id: true },
  });

  if (duplicateEmail) {
    return new Response(JSON.stringify({ error: "Email already exists." }), {
      status: 409,
    });
  }

  await prisma.user.update({
    where: { id: body.id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone || null,
    },
  });

  const profile = await prisma.driverProfile.findFirst({
    where: { userId: body.id, tenantId: body.tenantId },
    select: { id: true },
  });

  if (profile) {
    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: {
        status: body.status,
        licenseNumber: body.licenseNumber || null,
      },
    });
  } else {
    await prisma.driverProfile.create({
      data: {
        userId: body.id,
        tenantId: body.tenantId,
        status: body.status,
        licenseNumber: body.licenseNumber || null,
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

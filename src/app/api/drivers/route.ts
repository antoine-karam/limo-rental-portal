import { prisma } from "@/lib/prisma";

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const search = searchParams.get("search")?.trim();

  if (!tenantId) {
    return new Response(JSON.stringify({ drivers: [], total: 0, active: 0, offDuty: 0, avgRating: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
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

  const active = drivers.filter((d) => d.status === "AVAILABLE" || d.status === "ON_RIDE").length;
  const offDuty = drivers.filter((d) => d.status === "OFFLINE").length;
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

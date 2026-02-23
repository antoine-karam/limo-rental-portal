import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { RecentBookingsResult, Statistics, Tenant } from "./models/tenant";
import { BookingStatus, DriverStatus } from "./models/enums";

export async function getTenantSlug(): Promise<string | null> {
  const cookiesList = await cookies();
  return cookiesList.get("x-tenant-slug")?.value ?? null;
}

/**
 * Resolve the full tenant record from the slug.
 * Throws if the tenant is not found or inactive.
 */
export async function getTenant(): Promise<Tenant | null> {
  const slug = await getTenantSlug();
  if (!slug) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, active: true },
  });
  if (!tenant) return null;
  return tenant;
}

/**
 * Like getTenant() but throws a 404-style error if not found.
 * Use in layouts that require a valid tenant.
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getTenant();
  if (!tenant) {
    throw new Error("Tenant not found or inactive");
  }
  return tenant;
}

export async function getAllTenants() {
  return prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function getTenantStatisticsById(
  tenantId?: string,
): Promise<Statistics> {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    revenueThisMonth,
    revenueLastMonth,
    totalBookingsThisMonth,
    totalBookingsToday,
    totalVehicles,
    totalInactiveVehicles,
    totalDrivers,
    totalInactiveDrivers,
    completedThisMonth,
    nonCancelledThisMonth,
    completedLastMonth,
    nonCancelledLastMonth,
    tripDurations,
    ratingAggregate,
    totalReviews,
  ] = await Promise.all([
    prisma.booking.aggregate({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: BookingStatus.COMPLETED,
        scheduledAt: { gte: startOfThisMonth, lt: startOfNextMonth },
      },
      _sum: { finalPrice: true },
    }),
    prisma.booking.aggregate({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: BookingStatus.COMPLETED,
        scheduledAt: { gte: startOfLastMonth, lt: startOfThisMonth },
      },
      _sum: { finalPrice: true },
    }),
    prisma.booking.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { not: BookingStatus.CANCELLED },
        scheduledAt: { gte: startOfThisMonth, lt: startOfNextMonth },
      },
    }),
    prisma.booking.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { not: BookingStatus.CANCELLED },
        scheduledAt: { gte: startOfToday, lt: endOfToday },
      },
    }),
    prisma.vehicle.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        active: true,
      },
    }),
    prisma.vehicle.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        active: false,
      },
    }),
    prisma.driverProfile.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { not: DriverStatus.OFFLINE },
      },
    }),
    prisma.driverProfile.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: DriverStatus.OFFLINE,
      },
    }),

    prisma.booking.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: BookingStatus.COMPLETED,
        scheduledAt: { gte: startOfThisMonth, lt: startOfNextMonth },
      },
    }),
    prisma.booking.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { not: BookingStatus.CANCELLED },
        scheduledAt: { gte: startOfThisMonth, lt: startOfNextMonth },
      },
    }),
    prisma.booking.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: BookingStatus.COMPLETED,
        scheduledAt: { gte: startOfLastMonth, lt: startOfThisMonth },
      },
    }),
    prisma.booking.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { not: BookingStatus.CANCELLED },
        scheduledAt: { gte: startOfLastMonth, lt: startOfThisMonth },
      },
    }),

    prisma.ride.findMany({
      where: {
        booking: {
          ...(tenantId ? { tenantId } : {})
        },
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: { startedAt: true, completedAt: true },
    }),

    prisma.review.aggregate({
      where: { booking: { ...(tenantId ? { tenantId } : {}) } },
      _avg: { driverRating: true, vehicleRating: true },
      _count: { id: true },
    }),
    prisma.review.count({
      where: { booking: { ...(tenantId ? { tenantId } : {}) } },
    }),
  ]);

  const completionRateThisMonth =
    nonCancelledThisMonth > 0
      ? (completedThisMonth / nonCancelledThisMonth) * 100
      : 0;
  const completionRateLastMonth =
    nonCancelledLastMonth > 0
      ? (completedLastMonth / nonCancelledLastMonth) * 100
      : 0;

  const avgTripDurationMinutes =
    tripDurations.length > 0
      ? tripDurations.reduce((sum, ride) => {
          const ms = ride.completedAt!.getTime() - ride.startedAt!.getTime();
          return sum + ms / 60_000;
        }, 0) / tripDurations.length
      : 0;

  const avgDriver = ratingAggregate._avg.driverRating ?? 0;
  const avgVehicle = ratingAggregate._avg.vehicleRating ?? 0;
  const validCount = (avgDriver > 0 ? 1 : 0) + (avgVehicle > 0 ? 1 : 0);
  const averageCustomerRating =
    validCount > 0 ? (Number(avgDriver) + Number(avgVehicle)) / validCount : 0;

  return {
    totalRevenueThisMonth: Number(revenueThisMonth._sum.finalPrice ?? 0),
    totalRevenueLastMonth: Number(revenueLastMonth._sum.finalPrice ?? 0),
    totalBookingsThisMonth,
    totalBookingsToday,
    totalVehicles,
    totalInactiveVehicles,
    totalDrivers,
    totalInactiveDrivers,
    completionRateThisMonth: Math.round(completionRateThisMonth * 10) / 10,
    completionRateLastMonth: Math.round(completionRateLastMonth * 10) / 10,
    avgTripDurationMinutes: Math.round(avgTripDurationMinutes),
    averageCustomerRating: Math.round(averageCustomerRating * 10) / 10,
    totalReviews,
  };
}

export async function getRecentBookings(
  tenantId?: string,
  options: {
    limit?: number;
    offset?: number;
    status?: BookingStatus;
  } = {},
): Promise<RecentBookingsResult> {
  const { limit = 10, offset = 0, status } = options;

  const where = {
    ...(tenantId ? { tenantId } : {}),
    ...(status ? { status } : {}),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        scheduledAt: true,
        status: true,
        quotedPrice: true,
        finalPrice: true,
        currency: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            name: true,
            type: true,
          },
        },
        driver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      ...b,
      customer: {
        firstName: b.user.firstName,
        lastName: b.user.lastName,
        email: b.user.email,
        phone: b.user.phone,
      },
      quotedPrice: Number(b.quotedPrice),
      finalPrice: b.finalPrice ? Number(b.finalPrice) : null,
    })),
    total,
  };
}

import { Prisma } from "@/generated/prisma/client";
import {
  BookingStatusFilter,
  GetAllBookingsParams,
  GetAllBookingsResult,
} from "./models/booking";
import { BookingStatus } from "./models/enums";
import { getDateRangeFilter } from "@/lib/helper";
import { prisma } from "@/lib/prisma";

function toBookingStatus(
  filter: BookingStatusFilter,
): BookingStatus | undefined {
  const map: Partial<Record<BookingStatusFilter, BookingStatus>> = {
    pending: BookingStatus.PENDING,
    confirmed: BookingStatus.CONFIRMED,
    "in-progress": BookingStatus.IN_PROGRESS,
    completed: BookingStatus.COMPLETED,
    cancelled: BookingStatus.CANCELLED,
  };
  return map[filter];
}

const bookingSelect = {
  id: true,
  pickupAddress: true,
  dropoffAddress: true,
  distanceKm: true,
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
    select: { name: true, type: true },
  },
  driver: {
    select: { firstName: true, lastName: true },
  },
} satisfies Prisma.BookingSelect;

export async function getAllBookings({
  tenantId = undefined,
  search = "",
  status = "all",
  dateRange = "all",
  limit = 20,
  offset = 0,
}: GetAllBookingsParams): Promise<GetAllBookingsResult> {
  const dateFilter = getDateRangeFilter(dateRange);
  const statusValue = toBookingStatus(status);

  const searchFilter: Prisma.BookingWhereInput = search.trim()
    ? {
        OR: [
          { id: { contains: search, mode: "insensitive" } },
          { user: { firstName: { contains: search, mode: "insensitive" } } },
          { user: { lastName: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  const where: Prisma.BookingWhereInput = {
    ...(tenantId ? { tenantId } : {}),
    ...(statusValue ? { status: statusValue } : {}),
    ...(dateFilter ? { scheduledAt: dateFilter } : {}),
    ...searchFilter,
  };

  const baseWhere: Prisma.BookingWhereInput = {
    ...(tenantId ? { tenantId } : {}),
    ...(dateFilter ? { scheduledAt: dateFilter } : {}),
    ...searchFilter,
  };

  const [bookings, total, countResults] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      take: limit,
      skip: offset,
      select: bookingSelect,
    }),

    prisma.booking.count({ where }),

    Promise.all([
      prisma.booking.count({ where: baseWhere }),
      prisma.booking.count({
        where: { ...baseWhere, status: BookingStatus.PENDING },
      }),
      prisma.booking.count({
        where: { ...baseWhere, status: BookingStatus.CONFIRMED },
      }),
      prisma.booking.count({
        where: { ...baseWhere, status: BookingStatus.IN_PROGRESS },
      }),
      prisma.booking.count({
        where: { ...baseWhere, status: BookingStatus.COMPLETED },
      }),
      prisma.booking.count({
        where: { ...baseWhere, status: BookingStatus.CANCELLED },
      }),
    ]),
  ]);

  const [all, pending, confirmed, inProgress, completed, cancelled] =
    countResults;

  return {
    bookings: bookings.map((b) => ({
      ...b,
      customer: {
        firstName: b.user.firstName,
        lastName: b.user.lastName,
        email: b.user.email,
        phone: b.user.phone,
      },
      distanceKm: b.distanceKm ? Number(b.distanceKm) : null,
      quotedPrice: Number(b.quotedPrice),
      finalPrice: b.finalPrice ? Number(b.finalPrice) : null,
    })),
    total,
    counts: { all, pending, confirmed, inProgress, completed, cancelled },
  };
}

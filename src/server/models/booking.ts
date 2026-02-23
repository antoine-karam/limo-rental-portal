import { BookingStatus } from "./enums";

export type BookingStatusFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled";

export type DateRangeFilter = "all" | "today" | "week" | "month";

export interface BookingRow {
  id: string;
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  vehicle: {
    name: string;
    type: string;
  };
  driver: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  pickupAddress: string;
  dropoffAddress: string | null;
  distanceKm: number | null;
  scheduledAt: Date;
  status: BookingStatus;
  quotedPrice: number;
  finalPrice: number | null;
  currency: string;
}

export interface BookingStatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface GetAllBookingsResult {
  bookings: BookingRow[];
  total: number;
  counts: BookingStatusCounts;
}

export interface GetAllBookingsParams {
  tenantId?: string;
  search?: string;
  status?: BookingStatusFilter;
  dateRange?: DateRangeFilter;
  limit?: number;
  offset?: number;
}

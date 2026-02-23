import { JsonValue } from "@prisma/client/runtime/client";
import { BookingStatus, GeoRestrictionType } from "./enums";

export interface Tenant {
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
  geoRestrictionEnabled: boolean;
  geoRestrictionType: GeoRestrictionType | null;
  geoRestrictionValue: JsonValue;
  active: boolean;
}
export interface Statistics {
  totalRevenueThisMonth: number;
  totalRevenueLastMonth: number;
  totalBookingsThisMonth: number;
  totalBookingsToday: number;
  totalVehicles: number;
  totalInactiveVehicles: number;
  totalDrivers: number;
  totalInactiveDrivers: number;
  completionRateThisMonth: number;
  completionRateLastMonth: number;
  avgTripDurationMinutes: number;
  averageCustomerRating: number;
  totalReviews: number;
}

export interface RecentBooking {
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
  scheduledAt: Date;
  status: BookingStatus;
  quotedPrice: number;
  finalPrice: number | null;
  currency: string;
}

export interface RecentBookingsResult {
  bookings: RecentBooking[];
  total: number;
}
export const UserRole = {
  END_USER: "END_USER",
  DRIVER: "DRIVER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DriverStatus = {
  AVAILABLE: "AVAILABLE",
  ON_RIDE: "ON_RIDE",
  OFFLINE: "OFFLINE",
} as const;

export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const VehicleType = {
  SEDAN: "SEDAN",
  SUV: "SUV",
  VAN: "VAN",
  SPRINTER: "SPRINTER",
  STRETCH_LIMO: "STRETCH_LIMO",
} as const;

export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const RideType = {
  TO_AIRPORT: "TO_AIRPORT",
  FROM_AIRPORT: "FROM_AIRPORT",
  HOURLY: "HOURLY",
} as const;

export type RideType = (typeof RideType)[keyof typeof RideType];

export const PricingModel = {
  FLAT_RATE: "FLAT_RATE",
  PER_MILE: "PER_MILE",
  PER_KM: "PER_KM",
  HOURLY: "HOURLY",
} as const;

export type PricingModel = (typeof PricingModel)[keyof typeof PricingModel];

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const RideStatus = {
  EN_ROUTE_TO_PICKUP: "EN_ROUTE_TO_PICKUP",
  ARRIVED: "ARRIVED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export type RideStatus = (typeof RideStatus)[keyof typeof RideStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const GeoRestrictionType = {
  STATE: "STATE",
  RADIUS: "RADIUS",
  POLYGON: "POLYGON",
} as const;

export type GeoRestrictionType =
  (typeof GeoRestrictionType)[keyof typeof GeoRestrictionType];

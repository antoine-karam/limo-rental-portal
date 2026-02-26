import { PricingModel, RideType } from "@/server/models/enums";

export type VehicleQuoteRule = {
  pricingModel: PricingModel;
  basePrice: number;
  perUnitPrice: number | null;
  minimumHours: number | null;
  currency: string;
};

export type BookingVehicleOption = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  capacity: number;
  imageUrl: string | null;
  pricingByRideType: Partial<Record<RideType, VehicleQuoteRule>>;
};

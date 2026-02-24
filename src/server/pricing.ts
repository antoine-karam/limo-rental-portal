import { PricingModel, RideType, type PricingRule, type Vehicle, type VehicleType } from "@/generated/prisma/client";

export type QuoteInput = {
  distanceMiles: number;
  distanceKm: number;
  durationHours: number;
};

const decimalToNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number((value as { toString: () => string }).toString());
  }
  return 0;
};

const resolveRule = (
  rules: PricingRule[],
  vehicleId: string,
  vehicleType: VehicleType,
  rideType: RideType,
): PricingRule | null => {
  const byVehicleId = rules.find(
    (rule) => rule.rideType === rideType && rule.vehicleId === vehicleId,
  );

  if (byVehicleId) return byVehicleId;

  const byVehicleType = rules.find(
    (rule) =>
      rule.rideType === rideType && !rule.vehicleId && rule.vehicleType === vehicleType,
  );

  if (byVehicleType) return byVehicleType;

  const catchAll = rules.find(
    (rule) => rule.rideType === rideType && !rule.vehicleId && !rule.vehicleType,
  );

  return catchAll ?? null;
};

export const calculateVehiclePrice = (
  vehicle: Pick<Vehicle, "id" | "type">,
  rules: PricingRule[],
  rideType: RideType,
  quoteInput: QuoteInput,
): { amount: number; currency: string; ruleId: string | null } => {
  const selectedRule = resolveRule(rules, vehicle.id, vehicle.type, rideType);

  if (!selectedRule) {
    return { amount: 0, currency: "USD", ruleId: null };
  }

  const basePrice = decimalToNumber(selectedRule.basePrice);
  const perUnitPrice = decimalToNumber(selectedRule.perUnitPrice);
  const minimumHours = decimalToNumber(selectedRule.minimumHours);

  let amount = basePrice;

  if (selectedRule.pricingModel === PricingModel.PER_MILE) {
    amount += quoteInput.distanceMiles * perUnitPrice;
  }

  if (selectedRule.pricingModel === PricingModel.PER_KM) {
    amount += quoteInput.distanceKm * perUnitPrice;
  }

  if (selectedRule.pricingModel === PricingModel.HOURLY) {
    const billableHours = Math.max(quoteInput.durationHours, minimumHours || 0);
    amount += billableHours * perUnitPrice;
  }

  return {
    amount: Number(amount.toFixed(2)),
    currency: selectedRule.currency,
    ruleId: selectedRule.id,
  };
};

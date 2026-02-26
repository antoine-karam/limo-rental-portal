import { getTenant } from "@/server/tenants";
import { getUserSessionMetadata } from "@/server/users";
import { prisma } from "@/lib/prisma";
import { RideType } from "@/server/models/enums";

import { TopNav } from "@/app/components/TopNav";
import { Stepper } from "@/app/components/Stepper";

import styles from "./booking.module.css";
import { BookingForm } from "./components/BookingForm";
import { BookingVehicleOption, VehicleQuoteRule } from "./types";
const steps = [
  { label: "Trip Details", description: "Where & when" },
  { label: "Select Vehicle", description: "Choose your ride" },
  { label: "Passenger", description: "Passenger details" },
  { label: "Payment", description: "Confirm & pay" },
];

async function getBookingVehicleOptions(tenantId?: string) {
  if (!tenantId) return [] satisfies BookingVehicleOption[];

  const [vehicles, pricingRules] = await Promise.all([
    prisma.vehicle.findMany({
      where: { tenantId, active: true },
      select: {
        id: true,
        name: true,
        type: true,
        make: true,
        model: true,
        year: true,
        capacity: true,
        photos: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pricingRule.findMany({
      where: { tenantId, active: true },
      select: {
        vehicleId: true,
        vehicleType: true,
        rideType: true,
        pricingModel: true,
        basePrice: true,
        perUnitPrice: true,
        minimumHours: true,
        currency: true,
      },
      orderBy: [{ vehicleId: "desc" }, { vehicleType: "desc" }],
    }),
  ]);

  const resolveRule = (vehicleId: string, vehicleType: string, rideType: RideType) => {
    const exactVehicleRule = pricingRules.find(
      (rule) => rule.rideType === rideType && rule.vehicleId === vehicleId,
    );
    if (exactVehicleRule) return exactVehicleRule;

    const typeRule = pricingRules.find(
      (rule) =>
        rule.rideType === rideType &&
        !rule.vehicleId &&
        rule.vehicleType === vehicleType,
    );
    if (typeRule) return typeRule;

    return (
      pricingRules.find(
        (rule) =>
          rule.rideType === rideType && !rule.vehicleId && !rule.vehicleType,
      ) ?? null
    );
  };

  return vehicles.map((vehicle) => {
    const pricingByRideType: Partial<Record<RideType, VehicleQuoteRule>> = {};

    for (const rideType of Object.values(RideType)) {
      const matchedRule = resolveRule(vehicle.id, vehicle.type, rideType);
      if (!matchedRule) continue;
      pricingByRideType[rideType] = {
        pricingModel: matchedRule.pricingModel,
        basePrice: Number(matchedRule.basePrice),
        perUnitPrice: matchedRule.perUnitPrice
          ? Number(matchedRule.perUnitPrice)
          : null,
        minimumHours: matchedRule.minimumHours
          ? Number(matchedRule.minimumHours)
          : null,
        currency: matchedRule.currency,
      };
    }

    return {
      id: vehicle.id,
      name: vehicle.name,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      capacity: vehicle.capacity,
      imageUrl: vehicle.photos[0] ?? null,
      pricingByRideType,
    };
  });
}

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const tenant = await getTenant();
  const { step } = await searchParams;
  const currentStep = step ? parseInt(step) : 0;
  const sessionUser = await getUserSessionMetadata();
  const vehicles = await getBookingVehicleOptions(tenant?.id);

  return (
    <div className={styles.page}>
      <TopNav tenant={tenant} sessionUser={sessionUser} />

      <div className={styles.container}>
        <Stepper steps={steps} currentStep={currentStep} />
        <div className={styles.mainContent}>
          <BookingForm
            initialStep={currentStep}
            vehicles={vehicles}
            geoRestrictionEnabled={tenant?.geoRestrictionEnabled ?? false}
            geoRestrictionType={tenant?.geoRestrictionType ?? null}
            geoRestrictionValue={tenant?.geoRestrictionValue ?? null}
          />
        </div>
      </div>
    </div>
  );
}

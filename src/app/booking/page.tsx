import { getTenant } from "@/server/tenants";
import { getUserSessionMetadata } from "@/server/users";

import { TopNav } from "@/app/components/TopNav";
import { Stepper } from "@/app/components/Stepper";

import styles from "./booking.module.css";
import { BookingForm } from "./components/BookingForm";
const steps = [
  { label: "Trip Details", description: "Where & when" },
  { label: "Select Vehicle", description: "Choose your ride" },
  { label: "Passenger", description: "Passenger details" },
  { label: "Payment", description: "Confirm & pay" },
];

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const tenant = await getTenant();
  const { step } = await searchParams;
  const currentStep = step ? parseInt(step) : 0;
  const sessionUser = await getUserSessionMetadata();

  return (
    <div className={styles.page}>
      <TopNav tenant={tenant} sessionUser={sessionUser} />

      <div className={styles.container}>
        <Stepper steps={steps} currentStep={currentStep} />
        <div className={styles.mainContent}>
          <BookingForm
            initialStep={currentStep}
            geoRestrictionEnabled={tenant?.geoRestrictionEnabled ?? false}
            geoRestrictionType={tenant?.geoRestrictionType ?? null}
            geoRestrictionValue={tenant?.geoRestrictionValue ?? null}
          />
        </div>
      </div>
    </div>
  );
}

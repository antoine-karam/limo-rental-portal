import { Tenant } from "@/server/models/tenant";
import styles from "./TrustIndicator.module.css";
import { CheckCircle2, Clock, Shield, Star } from "lucide-react";
const features = [
  { icon: Shield, text: "Licensed & Insured" },
  { icon: Star, text: "Professional Drivers" },
  { icon: Clock, text: "24/7 Availability" },
  { icon: CheckCircle2, text: "Premium Fleet" },
];

export function TrustIndicator({
  tenant,
}: {
  tenant: Tenant | null | undefined;
}) {
  return (
    <section className={styles.trustSection}>
      <div className="container">
        <div className={styles.trustGrid}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className={styles.trustItem}>
                <Icon size={24} className={styles.trustIcon} />
                <span className={styles.trustText}>{feature.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

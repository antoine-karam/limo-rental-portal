
import { LucideIcon } from "lucide-react";
import styles from "./DashboardCard.module.css";

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  className?: string;
}

const changeStyles = {
  positive: styles.changePositive,
  negative: styles.changeNegative,
  neutral: styles.changeNeutral,
} as const;

export function DashboardCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  className,
}: DashboardCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.title}>{title}</p>
          <p className={styles.value}>{value}</p>
          {change && (
            <p className={`${styles.change} ${changeStyles[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className={styles.iconWrap}>
            <Icon />
          </div>
        )}
      </div>
    </div>
  );
}

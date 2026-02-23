import { BookingStatus } from '@/server/models/enums';
import styles from './StatusBadge.module.css';


interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

const statusConfig: Record<BookingStatus, { label: string; style: string }> = {
  'PENDING':     { label: 'Pending',     style: styles.pending },
  'CONFIRMED':   { label: 'Confirmed',   style: styles.confirmed },
  'IN_PROGRESS': { label: 'In Progress', style: styles.inProgress },
  'COMPLETED':   { label: 'Completed',   style: styles.completed },
  'CANCELLED':   { label: 'Cancelled',   style: styles.cancelled },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`${styles.badge} ${config.style} ${className ?? ''}`}>
      {config.label}
    </span>
  );
}
import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          <p className={styles.footerText}>
            &copy; 2026 CARS-ON-SPOT. All rights reserved. Licensed &
            Insured.
          </p>
          <div className={styles.footerLinks}>
            <Link href="/sitemap" className={styles.footerLink}>
              Site Map
            </Link>
            <span className={styles.footerDivider}>•</span>
            <Link href="/design-system" className={styles.footerLink}>
              Design System
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

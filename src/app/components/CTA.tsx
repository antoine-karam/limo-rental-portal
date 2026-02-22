import Link from "next/link";
import styles from "./CTA.module.css";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
     <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to Experience Luxury?</h2>
            <p className={styles.ctaDescription}>
              Book your ride in minutes and enjoy a premium transportation experience
            </p>
            <Link href="/booking" className="btn btn-primary btn-lg">
              Book Your Ride Now
              <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Link>
          </div>
        </div>
      </section>
  );
}

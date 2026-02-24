"use client";

import Link from "next/link";
import Image from "next/image";
import { Tenant } from "@/server/models/tenant";

import styles from "./HeroSection.module.css";
import { ArrowRight } from "lucide-react";

export function HeroSection({ tenant }: { tenant: Tenant | null | undefined }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroBackground}>
        <Image
          src={`${process.env.NEXT_PUBLIC_S2_BUCKET_ENDPOINT}/${tenant?.slug ?? "default"}/hero-section.png`}
          alt="Luxury Limousine"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <div className={styles.heroOverlay} />
      </div>

      <div className="container">
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {tenant?.name}
            <br />
            <span className={styles.heroTitleAccent}>Limo Services</span>
          </h1>
          <p className={styles.heroDescription}>
            Experience premium limousine service across Texas. Professional
            drivers, luxury vehicles, and exceptional service for every
            occasion.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/booking" className="btn btn-primary btn-lg">
              Book Now
              <ArrowRight size={20} style={{ marginLeft: "0.5rem" }} />
            </Link>
            <Link href="/fleet" className="btn btn-outline btn-lg">
              View Fleet
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.scrollIndicator}>
        <div className={styles.scrollMouse}>
          <div className={styles.scrollWheel} />
        </div>
      </div>
    </section>
  );
}

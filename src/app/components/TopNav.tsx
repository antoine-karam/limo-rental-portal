"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Tenant } from "@/server/models/tenant";

import styles from "./TopNav.module.css";

export function TopNav({ tenant }: { tenant: Tenant | null | undefined }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className={styles.topNav}>
      <div className="container mx-auto px-6">
        <div className={styles.navContent}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <Image
                className="w6- h-6 text-primary-foreground"
                src={tenant?.logoUrl || "/default-logo.png"}
                alt="Logo"
                width={24}
                height={24}
              />
            </div>
            <div className={styles.logoText}>
              <h1 className={styles.logoTitle}>
                {tenant?.slug || "Limo Rental"}
              </h1>
              <p className={styles.logoSubtitle}>
                {tenant?.name || "Default Tenant"}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className={styles.navLinks}>
            <Link
              href="/"
              className={`${styles.navLink} ${
                isActive("/") ? styles.active : ""
              }`}
            >
              Home
            </Link>
            <Link
              href="/fleet"
              className={`${styles.navLink} ${
                isActive("/fleet") ? styles.active : ""
              }`}
            >
              Fleet
            </Link>
            <Link
              href="/booking"
              className={`${styles.navLink} ${
                isActive("/booking") ? styles.active : ""
              }`}
            >
              Book Now
            </Link>
          </div>

          {/* CTA Button */}
            <div className={styles.navCta}>
            <Link href="/booking" className="btn btn-primary">
                Book a Ride
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

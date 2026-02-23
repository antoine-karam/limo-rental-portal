"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import type { Tenant } from "@/server/models/tenant";
import type { SessionUserMetadata } from "@/server/models/user";

import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import styles from "./TopNav.module.css";

type TopNavProps = {
  tenant: Tenant | null | undefined;
  sessionUser?: SessionUserMetadata | null;
};
const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export function TopNav({ tenant, sessionUser }: TopNavProps) {
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
            {sessionUser?.role === "SUPER_ADMIN" && (
              <Link
                href="/admin"
                className={`${styles.navLink} ${isActive("/admin") ? styles.active : ""}`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* CTA Buttons */}
          <div className={styles.navCta}>
            <Link href="/booking" className="btn btn-primary">
              Book a Ride
            </Link>
            {sessionUser ? (
             <LogoutLink
                className="btn btn-outline"
                postLogoutRedirectURL={`${origin}/auth/callback?flow=logout`}
              >
                Sign Out 
              </LogoutLink>
            ) : (
              <Link href="/auth/sign-in" className="btn btn-outline">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import {
    Calendar,
    Car,
    LayoutDashboard,
    LogOut,
    Settings,
    Users,
} from "lucide-react";
import { Tenant } from "@/generated/prisma/browser";

import styles from "./SideBarNav.module.css";

const adminLinks = [
  { icon: LayoutDashboard, label: "Dashboard", path: "" },
  { icon: Calendar, label: "Bookings", path: "bookings" },
  { icon: Car, label: "Fleet", path: "fleet" },
  { icon: Users, label: "Drivers", path: "drivers" },
  { icon: Settings, label: "Settings", path: "settings" },
];

const driverLinks = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/driver" },
  { icon: Calendar, label: "My Trips", path: "/driver/trips" },
  { icon: Settings, label: "Settings", path: "/driver/settings" },
];

export function SideBarNav({
  role,
  tenants,
  selectedTenantId,
}: {
  role: "ADMIN" | "DRIVER" | "SUPER_ADMIN";
  tenants: Tenant[];
  selectedTenantId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname(); // e.g. "/admin/abc/bookings"
  const root = pathname.split("/")[1] || "admin"; // "admin"

  function selectTenant(id: string) {
    router.push(`/${root}/${id.toString()}`);
  }
  const [tenant, setTenant] = useState<Tenant | null>(() => {
    if (!selectedTenantId) return null;
    return tenants.find((t) => t.id === selectedTenantId) ?? null;
  });
  const links = role === "DRIVER" ? driverLinks : adminLinks;

  const tenantBase = useMemo(() => {
    if (root === "admin") {
      return selectedTenantId ? `/admin/${selectedTenantId}` : "/admin";
    }
    return `/${root}`;
  }, [root, selectedTenantId]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoSection}>
        <Link
          href={selectedTenantId ? `/admin/${selectedTenantId}` : "/admin"}
          className={styles.logoLink}
        >
          <div className={styles.logoIcon}>
            <Image
              className="w6- h-6 text-primary-foreground"
              src={tenant?.logoUrl || "/default-logo.png"}
              alt="Logo"
              width={24}
              height={24}
            />
          </div>
          <div>
            <p className={styles.logoTitle}>
              {tenant?.name || "Default Tenant"}
            </p>
            <p className={styles.logoRole}>{role} Portal</p>
          </div>
        </Link>
      </div>
      {role === "SUPER_ADMIN" && (
        <div className={styles.tenantSelector}>
          <label htmlFor="tenant-select">Select Tenant:</label>
          <select
            id="tenant-select"
            value={selectedTenantId || ""}
            onChange={(e) => {
              const id = e.target.value;
              const selected = tenants.find((t) => t.id === id) ?? null;
              setTenant(selected);
              if (id) selectTenant(id);
            }}
          >
            <option value="">Select a tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <nav className={styles.nav}>
        {role === "DRIVER"
          ? links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                >
                  <Icon />
                  <span>{link.label}</span>
                </Link>
              );
            })
          : adminLinks.map((link) => {
              const Icon = link.icon;

              // Build correct routes: /admin/:tenantId/<subpath>
              const href =
                selectedTenantId
                  ? `${tenantBase}/${link.path}`.replace(/\/$/, "")
                  : "/admin"; // if no tenant selected, keep them on /admin

              const isActive =
                link.path === ""
                  ? pathname === tenantBase
                  : pathname.startsWith(`${tenantBase}/${link.path}`);

              return (
                <Link
                  key={link.label}
                  href={href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                >
                  <Icon />
                  <span>{link.label}</span>
                </Link>
              );
            })}
      </nav>
      <div className={styles.footer}>
        <LogoutLink className={styles.logoutBtn}>
          <LogOut />
          <span>Logout</span>
        </LogoutLink>
      </div>
    </aside>
  );
}

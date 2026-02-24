"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Phone, Search, Star, UserPlus } from "lucide-react";

import { useAdminTenant } from "@/app/admin/_providers/AdminTenantProvider";
import { DriverRow } from "@/server/models/adminDriver";

import styles from "./drivers.module.css";

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unnamed Driver";
}

function initials(firstName: string | null, lastName: string | null) {
  const first = firstName?.[0] ?? "";
  const last = lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "DR";
}

function statusLabel(status: DriverRow["status"]) {
  if (status === "AVAILABLE" || status === "ON_RIDE") return "Active";
  if (status === "OFFLINE") return "Off Duty";
  return "Inactive";
}

function statusClass(status: DriverRow["status"]) {
  if (status === "AVAILABLE" || status === "ON_RIDE") return styles.statusActive;
  if (status === "OFFLINE") return styles.statusOffDuty;
  return styles.statusInactive;
}

export default function AdminDriversPage() {
  const { tenantId } = useAdminTenant();
  const canMutate = tenantId && tenantId !== "default";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [offDuty, setOffDuty] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchDrivers = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({ tenantId });
      if (debouncedSearch) query.set("search", debouncedSearch);

      const response = await fetch(`/api/drivers?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed request");

      const data = await response.json();
      setDrivers(data.drivers);
      setTotal(data.total);
      setActive(data.active);
      setOffDuty(data.offDuty);
      setAvgRating(data.avgRating);
    } catch {
      setError("Failed to load drivers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, debouncedSearch]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const inactiveCount = useMemo(() => total - active - offDuty, [active, offDuty, total]);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Driver Management</h1>
          <p>Manage your professional drivers</p>
        </div>
        <button
          className={styles.addBtn}
          disabled={!canMutate}
          title={canMutate ? "Add Driver" : "Select a tenant to add drivers"}
        >
          <UserPlus size={16} />
          Add Driver
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCounter}>
          <p className={styles.statLabel}>Total Drivers</p>
          <p className={styles.statValue}>{total}</p>
        </div>
        <div className={`${styles.statCounter} ${styles.statActive}`}>
          <p className={styles.statLabel}>Active</p>
          <p className={styles.statValue}>{active}</p>
        </div>
        <div className={`${styles.statCounter} ${styles.statWarning}`}>
          <p className={styles.statLabel}>Off Duty</p>
          <p className={styles.statValue}>{offDuty}</p>
        </div>
        <div className={styles.statCounter}>
          <p className={styles.statLabel}>Avg Rating</p>
          <p className={styles.statValue}>
            {avgRating.toFixed(1)} <Star size={14} className={styles.starInline} />
          </p>
        </div>
      </div>

      <div className={styles.searchCard}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drivers by name, email, or license..."
          />
        </div>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Contact</th>
              <th>License</th>
              <th>Rating</th>
              <th>Total Trips</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>Loading drivers…</td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>No drivers found.</td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <div className={styles.driverCell}>
                      <div className={styles.avatar}>{initials(driver.firstName, driver.lastName)}</div>
                      <p className={styles.driverName}>{fullName(driver.firstName, driver.lastName)}</p>
                    </div>
                  </td>
                  <td>
                    <p className={styles.contactLine}><Mail size={12} /> {driver.email}</p>
                    <p className={styles.contactLine}><Phone size={12} /> {driver.phone ?? "—"}</p>
                  </td>
                  <td className={styles.muted}>{driver.licenseNumber ?? "—"}</td>
                  <td className={styles.rating}><Star size={12} /> {driver.rating ? driver.rating.toFixed(1) : "—"}</td>
                  <td className={styles.trips}>{driver.totalRides}</td>
                  <td className={styles.muted}>{driver.vehicleName ?? "None"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${statusClass(driver.status)}`}>
                      {statusLabel(driver.status)}
                    </span>
                  </td>
                  <td>
                    <button className={styles.viewBtn}>View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!canMutate && (
        <p className={styles.helperText}>Add driver is disabled for default tenant.</p>
      )}
      {inactiveCount > 0 && <p className={styles.helperText}>{inactiveCount} inactive driver(s).</p>}
    </>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Download } from "lucide-react";

import { StatusBadge } from "@/app/components/StatusBadge";
import { useAdminTenant } from "@/app/admin/_providers/AdminTenantProvider";
import {
  BookingRow,
  BookingStatusCounts,
  BookingStatusFilter,
  DateRangeFilter,
} from "@/server/models/booking";

import styles from "./adminBooking.module.css";

const PAGE_SIZE = 20;

function formatDistance(km: number | null): string {
  if (km === null) return "—";
  return `${(km * 0.621371).toFixed(1)} mi`;
}

function formatName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ") || "—";
}

export default function AdminBookingsPage() {
  const { tenantId } = useAdminTenant();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<BookingStatusCounts>({
    all: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [status, setStatus] = useState<BookingStatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, status, dateRange]);

  const fetchBookings = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();

      query.set("tenantId", tenantId);
      query.set("limit", String(PAGE_SIZE));
      query.set("offset", String(page * PAGE_SIZE));

      if (debouncedSearch) query.set("search", debouncedSearch);
      if (status) query.set("status", status);

      if (dateRange) query.set("dateRange", dateRange);

      const result = await fetch(`/api/booking?${query.toString()}`, {
        method: "GET",
        cache: "no-store", 
      });
      const data = await result.json();
      setBookings(data.bookings);
      setTotal(data.total);
      setCounts(data.counts);
    } catch {
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, debouncedSearch, status, dateRange, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Bookings</h1>
          <p>Manage all customer bookings</p>
        </div>
        <button className={styles.exportBtn}>
          <Download />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by booking ID, customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={status}
            onChange={(e) => setStatus(e.target.value as BookingStatusFilter)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className={styles.filterSelect}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Status counters */}
      <div className={styles.statsRow}>
        <div className={styles.statCounter}>
          <p className={styles.statCounterLabel}>Total</p>
          <p className={`${styles.statCounterValue} ${styles.neutral}`}>
            {counts.all}
          </p>
        </div>
        <div className={`${styles.statCounter} ${styles.statCounterPending}`}>
          <p className={styles.statCounterLabel}>Pending</p>
          <p className={`${styles.statCounterValue} ${styles.warning}`}>
            {counts.pending}
          </p>
        </div>
        <div className={`${styles.statCounter} ${styles.statCounterConfirmed}`}>
          <p className={styles.statCounterLabel}>Confirmed</p>
          <p className={`${styles.statCounterValue} ${styles.info}`}>
            {counts.confirmed}
          </p>
        </div>
        <div className={`${styles.statCounter} ${styles.statCounterProgress}`}>
          <p className={styles.statCounterLabel}>In Progress</p>
          <p className={`${styles.statCounterValue} ${styles.primary}`}>
            {counts.inProgress}
          </p>
        </div>
        <div className={`${styles.statCounter} ${styles.statCounterCompleted}`}>
          <p className={styles.statCounterLabel}>Completed</p>
          <p className={`${styles.statCounterValue} ${styles.success}`}>
            {counts.completed}
          </p>
        </div>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Route</th>
              <th>Date &amp; Time</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.loadingCell}>
                  Loading bookings…
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className={styles.cellId}>{booking.id}</td>
                  <td>
                    <p className={styles.cellCustomerName}>
                      {formatName(
                        booking.customer.firstName,
                        booking.customer.lastName,
                      )}
                    </p>
                    <p className={styles.cellPhone}>
                      {booking.customer.phone ?? booking.customer.email}
                    </p>
                  </td>
                  <td className={styles.cellMuted}>{booking.vehicle.name}</td>
                  <td className={styles.cellMuted}>
                    {booking.driver
                      ? formatName(
                          booking.driver.firstName,
                          booking.driver.lastName,
                        )
                      : "Unassigned"}
                  </td>
                  <td className={styles.cellRoute}>
                    <p className={styles.cellRoutePickup}>
                      {booking.pickupAddress}
                    </p>
                    <p className={styles.cellRouteDropoff}>
                      {booking.dropoffAddress ?? "—"}
                    </p>
                    <p className={styles.cellRouteDistance}>
                      {formatDistance(booking.distanceKm)}
                    </p>
                  </td>
                  <td>
                    <p className={styles.cellDate}>
                      {booking.scheduledAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className={styles.cellTime}>
                      {booking.scheduledAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </td>
                  <td>
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className={styles.cellAmount}>
                    {booking.currency}{" "}
                    {(booking.finalPrice ?? booking.quotedPrice).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className={styles.paginationControls}>
              <button
                className={styles.pageBtn}
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className={styles.pageIndicator}>
                {page + 1} / {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

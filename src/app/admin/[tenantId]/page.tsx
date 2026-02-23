"use client";
import {
  Calendar,
  Car,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  TrendingDown,
} from "lucide-react";

import { DashboardCard } from "@/app/components/DashboardCard";
import { StatusBadge } from "@/app/components/StatusBadge";

import { useAdminTenant } from "@/app/admin/_providers/AdminTenantProvider";

import styles from "./adminDashboard.module.css";

export default  function AdminDashboardPage() {
  const { stats, bookings } = useAdminTenant();
  const completionRateChange =
    stats.completionRateThisMonth - stats.completionRateLastMonth;
  const completionRateChangeStr = `${completionRateChange >= 0 ? "+" : ""}${completionRateChange.toFixed(1)}% from last month`;
  return (
    <div className={styles.main}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p>Welcome back! Here&apos;s your business overview.</p>
      </div>
      <div className={styles.metricsGrid}>
        <DashboardCard
          title="Total Revenue"
          value={`$${stats.totalRevenueThisMonth.toLocaleString()}`}
          change={`${stats.totalRevenueThisMonth > stats.totalRevenueLastMonth ? "+" : ""}${(((stats.totalRevenueThisMonth - stats.totalRevenueLastMonth) / (stats.totalRevenueLastMonth || 1)) * 100).toFixed(1)}% from last month`}
          changeType={
            stats.totalRevenueThisMonth > stats.totalRevenueLastMonth
              ? "positive"
              : stats.totalRevenueThisMonth < stats.totalRevenueLastMonth
                ? "negative"
                : "neutral"
          }
          icon={DollarSign}
        />
        <DashboardCard
          title="Active Bookings"
          value={stats.totalBookingsThisMonth.toString()}
          change={`${stats.totalBookingsToday} scheduled today`}
          changeType={
            stats.totalBookingsToday > 5
              ? "positive"
              : stats.totalBookingsToday > 0
                ? "neutral"
                : "negative"
          }
          icon={Calendar}
        />
        <DashboardCard
          title="Fleet Vehicles"
          value={stats.totalVehicles.toString()}
          change={`${stats.totalInactiveVehicles} in maintenance`}
          changeType="neutral"
          icon={Car}
        />
        <DashboardCard
          title="Active Drivers"
          value={stats.totalDrivers.toString()}
          change={`${stats.totalInactiveDrivers} inactive`}
          changeType="neutral"
          icon={Users}
        />
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <h3>Completion Rate</h3>
            {completionRateChange >= 0 ? (
              <TrendingUp className={styles.iconSuccess} />
            ) : (
              <TrendingDown className={styles.iconError} />
            )}
          </div>
          <p className={styles.statValue}>{stats.completionRateThisMonth}%</p>
          <p
            className={
              completionRateChange >= 0
                ? styles.statChangePositive
                : styles.statChangeNegative
            }
          >
            {completionRateChangeStr}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <h3>Avg Trip Duration</h3>
            <Clock className={styles.iconPrimary} />
          </div>
          <p className={styles.statValue}>{stats.avgTripDurationMinutes} min</p>
          <p className={styles.statChangeMuted}>Across all trips</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <h3>Customer Rating</h3>
            <span className={styles.statEmoji}>⭐</span>
          </div>
          <p className={styles.statValue}>
            {stats.averageCustomerRating.toFixed(1)}
          </p>
          <p className={styles.statChangeMuted}>
            Based on {stats.totalReviews} reviews
          </p>
        </div>
      </div>
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h2>Recent Bookings</h2>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Pickup</th>
              <th>Date &amp; Time</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bookings?.length > 0 ? (
              bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className={styles.cellId}>{booking.id}</td>
                  <td className={styles.cellPrimary}>
                    {booking.customer.firstName} {booking.customer.lastName}
                  </td>
                  <td className={styles.cellMuted}>{booking.vehicle.name}</td>
                  <td className={styles.cellMuted}>{booking.pickupAddress}</td>
                  <td className={styles.cellMuted}>
                    {booking.scheduledAt.toLocaleDateString()}{" "}
                    <span className={styles.cellTime}>
                      {booking.scheduledAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className={styles.cellAmount}>
                    {booking.finalPrice?.toFixed(2)} {booking.currency}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  No recent bookings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

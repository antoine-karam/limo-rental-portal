import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { TopNav } from "@/app/components/TopNav";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/server/tenants";
import { getUserSessionMetadata } from "@/server/users";

import { AdminTableCard } from "./components/AdminTableCard";
import { TenantSettingsCard } from "./components/TenantSettingsCard";

function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value);
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatMoney(amount: number) {
  return currencyFormatter.format(amount);
}

function formatDisplayName(firstName: string | null, lastName: string | null) {
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return fullName || "N/A";
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function isValidSlug(value: string) {
  return /^[a-z0-9-]+$/.test(value);
}

function normalizeHexColor(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  if (!/^#[0-9a-fA-F]{6}$/.test(clean)) return null;
  return clean.toUpperCase();
}

async function updateTenantSettings(tenantId: string, formData: FormData) {
  "use server";

  const sessionUser = await getUserSessionMetadata();
  if (!sessionUser) {
    redirect("/auth/sign-in");
  }

  if (sessionUser.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const rawName = String(formData.get("name") ?? "").trim();
  const rawSlug = normalizeSlug(String(formData.get("slug") ?? ""));
  const rawPrimaryColor = String(formData.get("primaryColor") ?? "");
  const active = formData.get("active") === "on";

  if (!rawName || rawName.length > 255) {
    redirect("/admin?error=invalid-name");
  }

  if (!rawSlug || rawSlug.length > 100 || !isValidSlug(rawSlug)) {
    redirect("/admin?error=invalid-slug");
  }

  const primaryColor = normalizeHexColor(rawPrimaryColor);
  if (rawPrimaryColor.trim() && !primaryColor) {
    redirect("/admin?error=invalid-primary-color");
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: rawName,
        slug: rawSlug,
        primaryColor,
        active,
      },
    });
  } catch {
    redirect("/admin?error=update-failed");
  }

  revalidatePath("/admin");
  redirect("/admin?updated=1");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; updated?: string }>;
}) {
  const sessionUser = await getUserSessionMetadata();
  if (!sessionUser) {
    redirect("/auth/sign-in");
  }

  if (sessionUser.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const currentTenant = await getTenant();

  const [tenants, systemUsers, resolvedSearchParams] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        active: true,
        stripeOnboarded: true,
        stripeAccountId: true,
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        vehicles: {
          select: {
            id: true,
            name: true,
            type: true,
            capacity: true,
            active: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        bookings: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            quotedPrice: true,
            finalPrice: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { tenantId: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    searchParams,
  ]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav tenant={currentTenant} sessionUser={sessionUser} />
      <main className="container mx-auto px-6 py-8">
        <section className="mb-8">
          <h1 className="text-3xl mb-2">Super Admin Dashboard</h1>
          <p className="text-secondary">
            Manage tenants, monitor system-wide activity, and inspect platform-level accounts.
          </p>
          {resolvedSearchParams?.updated ? (
            <p className="badge badge-success mt-4">Tenant updated successfully.</p>
          ) : null}
          {resolvedSearchParams?.error ? (
            <p className="badge badge-error mt-4">Failed to update tenant: {resolvedSearchParams.error}.</p>
          ) : null}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl mb-4">Tenant Management</h2>
          {tenants.length === 0 ? <p className="text-secondary">No tenants found.</p> : null}
          {tenants.map((tenant) => (
            <TenantSettingsCard
              key={tenant.id}
              tenant={tenant}
              updateAction={updateTenantSettings.bind(null, tenant.id)}
            />
          ))}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl mb-4">Tenant Analytics Overview</h2>
          {tenants.map((tenant) => {
            const completedBookings = tenant.bookings.filter(
              (booking) => booking.status === "COMPLETED",
            ).length;

            const succeededPayments = tenant.payments.filter(
              (payment) => payment.status === "SUCCEEDED",
            );

            const revenueFromPayments = succeededPayments.reduce(
              (sum, payment) => sum + toNumber(payment.amount),
              0,
            );

            const fallbackRevenue = tenant.bookings.reduce((sum, booking) => {
              const value = booking.finalPrice ?? booking.quotedPrice;
              return sum + toNumber(value);
            }, 0);

            const estimatedRevenue =
              succeededPayments.length > 0 ? revenueFromPayments : fallbackRevenue;

            return (
              <section key={`analytics-${tenant.id}`} className="card mb-4">
                <div className="card-content">
                  <h3 className="text-xl text-primary mb-3">{tenant.name}</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    <p>Total Users: {tenant.users.length}</p>
                    <p>Total Vehicles: {tenant.vehicles.length}</p>
                    <p>Total Bookings: {tenant.bookings.length}</p>
                    <p>Total Completed Bookings: {completedBookings}</p>
                    <p>Estimated Revenue: {formatMoney(estimatedRevenue)}</p>
                  </div>
                </div>
              </section>
            );
          })}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl mb-4">Users by Company</h2>
          {tenants.map((tenant) => (
            <AdminTableCard key={`users-${tenant.id}`} title={tenant.name} subtitle={`Slug: ${tenant.slug}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-secondary">
                        No users.
                      </td>
                    </tr>
                  ) : (
                    tenant.users.map((user) => (
                      <tr key={user.id}>
                        <td>{formatDisplayName(user.firstName, user.lastName)}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>{user.createdAt.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </AdminTableCard>
          ))}

          <AdminTableCard title="Platform-Level Users" subtitle="System users with no tenant assignment.">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {systemUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-secondary">
                      No platform-level users.
                    </td>
                  </tr>
                ) : (
                  systemUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{formatDisplayName(user.firstName, user.lastName)}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.createdAt.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </AdminTableCard>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl mb-4">Vehicles by Company</h2>
          {tenants.map((tenant) => (
            <AdminTableCard key={`vehicles-${tenant.id}`} title={tenant.name} subtitle={`Slug: ${tenant.slug}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Active</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-secondary">
                        No vehicles.
                      </td>
                    </tr>
                  ) : (
                    tenant.vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td>{vehicle.name}</td>
                        <td>{vehicle.type}</td>
                        <td>{vehicle.capacity}</td>
                        <td>
                          <span className={`badge ${vehicle.active ? "badge-success" : "badge-warning"}`}>
                            {vehicle.active ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>{vehicle.createdAt.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </AdminTableCard>
          ))}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl mb-4">Bookings by Company</h2>
          {tenants.map((tenant) => (
            <AdminTableCard key={`bookings-${tenant.id}`} title={tenant.name} subtitle={`Slug: ${tenant.slug}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.bookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-secondary">
                        No bookings.
                      </td>
                    </tr>
                  ) : (
                    tenant.bookings.map((booking) => {
                      const bookingValue = booking.finalPrice ?? booking.quotedPrice;
                      return (
                        <tr key={booking.id}>
                          <td>{booking.id}</td>
                          <td>
                            {formatDisplayName(
                              booking.user.firstName,
                              booking.user.lastName,
                            )}
                            {booking.user.email ? ` (${booking.user.email})` : ""}
                          </td>
                          <td>{booking.status}</td>
                          <td>{booking.scheduledAt.toLocaleString()}</td>
                          <td>{formatMoney(toNumber(bookingValue))}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </AdminTableCard>
          ))}
        </section>
      </main>
    </div>
  );
}

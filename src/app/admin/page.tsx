import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { TopNav } from "@/app/components/TopNav";
import { getTenant } from "@/server/tenants";
import { getUserSessionMetadata } from "@/server/user-session";

async function updateTenantSettings(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("tenantId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const primaryColorRaw = String(formData.get("primaryColor") ?? "").trim();
  const primaryColor = primaryColorRaw.length ? primaryColorRaw : null;
  const active = formData.get("active") === "on";

  if (!tenantId || !name || !slug) {
    return;
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      slug,
      primaryColor,
      active,
    },
  });

  revalidatePath("/admin");
}

function toMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function AdminPage() {
  const sessionUser = await getUserSessionMetadata();

  if (!sessionUser) {
    redirect("/auth/sign-in");
  }

  if (sessionUser.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const currentTenant = await getTenant();
  const [tenants, systemUsersWithoutTenant] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
          },
        },
        vehicles: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            type: true,
            capacity: true,
            active: true,
            createdAt: true,
          },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            quotedPrice: true,
            finalPrice: true,
            currency: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        tenantId: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav tenant={currentTenant} sessionUser={sessionUser} />

      <main className="container mx-auto px-6 py-12">
        <section className="mb-8">
          <h1 className="mb-2">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage tenants, review system users, vehicles, bookings, and estimated tenant revenue.
          </p>
        </section>

        {systemUsersWithoutTenant.length > 0 && (
          <section className="card mb-8">
            <div className="card-content">
              <h3 className="mb-4">System Users (No Tenant)</h3>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsersWithoutTenant.map((user) => (
                      <tr key={user.id}>
                        <td>{`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "-"}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-col gap-8">
          {tenants.map((tenant) => {
            const estimatedRevenue = tenant.bookings.reduce((total, booking) => {
              const finalPrice = booking.finalPrice ? Number(booking.finalPrice) : null;
              const quotedPrice = Number(booking.quotedPrice);

              return total + (finalPrice ?? quotedPrice);
            }, 0);

            const currency = tenant.bookings[0]?.currency ?? "USD";

            return (
              <section key={tenant.id} className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <h3>{tenant.name}</h3>
                      <p className="text-muted-foreground">
                        Slug: {tenant.slug} · Active: {tenant.active ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Estimated revenue:</strong> {toMoney(estimatedRevenue, currency)}
                      </p>
                    </div>
                  </div>

                  <form action={updateTenantSettings} className="card mb-6" style={{ padding: "1rem" }}>
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor={`name-${tenant.id}`}>Name</label>
                        <input id={`name-${tenant.id}`} className="form-input" name="name" defaultValue={tenant.name} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor={`slug-${tenant.id}`}>Slug</label>
                        <input id={`slug-${tenant.id}`} className="form-input" name="slug" defaultValue={tenant.slug} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor={`primaryColor-${tenant.id}`}>Primary Color</label>
                        <input
                          id={`primaryColor-${tenant.id}`}
                          className="form-input"
                          name="primaryColor"
                          defaultValue={tenant.primaryColor ?? ""}
                          placeholder="#C9A84C"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor={`active-${tenant.id}`}>Active</label>
                        <input id={`active-${tenant.id}`} type="checkbox" name="active" defaultChecked={tenant.active} />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-outline mt-4">
                      Save Tenant Settings
                    </button>
                  </form>

                  <h4 className="mb-3">Users ({tenant.users.length})</h4>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table mb-6">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.users.map((user) => (
                          <tr key={user.id}>
                            <td>{`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "-"}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {tenant.users.length === 0 && (
                          <tr>
                            <td colSpan={4}>No users found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="mb-3">Vehicles ({tenant.vehicles.length})</h4>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table mb-6">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Capacity</th>
                          <th>Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.vehicles.map((vehicle) => (
                          <tr key={vehicle.id}>
                            <td>{vehicle.name}</td>
                            <td>{vehicle.type}</td>
                            <td>{vehicle.capacity}</td>
                            <td>{vehicle.active ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                        {tenant.vehicles.length === 0 && (
                          <tr>
                            <td colSpan={4}>No vehicles found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="mb-3">Bookings ({tenant.bookings.length})</h4>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>User</th>
                          <th>Status</th>
                          <th>Scheduled</th>
                          <th>Estimated Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.bookings.map((booking) => {
                          const bookingValue = booking.finalPrice
                            ? Number(booking.finalPrice)
                            : Number(booking.quotedPrice);

                          return (
                            <tr key={booking.id}>
                              <td>{booking.id.slice(0, 8)}...</td>
                              <td>{booking.user.email}</td>
                              <td>{booking.status}</td>
                              <td>{new Date(booking.scheduledAt).toLocaleString()}</td>
                              <td>{toMoney(bookingValue, booking.currency)}</td>
                            </tr>
                          );
                        })}
                        {tenant.bookings.length === 0 && (
                          <tr>
                            <td colSpan={5}>No bookings found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

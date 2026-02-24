import { redirect } from "next/navigation";

import { getUserSessionMetadata } from "@/server/users";
import {
  getAllTenants,
  getRecentBookings,
  getTenantStatisticsById,
} from "@/server/tenants";

import { SideBarNav } from "@/app/components/SideBarNav";
import { AdminTenantProvider } from "@/app/admin/_providers/AdminTenantProvider";

import styles from "./admin.module.css";

export default async function AdminPage({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const sessionUser = await getUserSessionMetadata();
  const tenants = await getAllTenants();
  const stats = await getTenantStatisticsById(tenantId);
  const { bookings } = await getRecentBookings(tenantId, { limit: 5 });

  if (!sessionUser) {
    redirect("/auth/sign-in");
  }

  if (
    sessionUser.role !== "SUPER_ADMIN" &&
    (sessionUser.role !== "ADMIN" || sessionUser.tenantId !== tenantId)
  ) {
    redirect("/");
  }

  return (
    <div className={styles.page}>
      <SideBarNav
        role={sessionUser.role}
        tenants={tenants}
        selectedTenantId={tenantId ?? ""}
      />
      <AdminTenantProvider value={{ tenantId, stats, bookings }}>
        <main className={styles.main}>{children}</main>
      </AdminTenantProvider>
    </div>
  );
}

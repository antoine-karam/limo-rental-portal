"use client";

import React, { createContext, useContext } from "react";
import { RecentBooking, Statistics } from "@/server/models/tenant";

type AdminTenantCtx = {
  tenantId: string | undefined;
  stats: Statistics;
  bookings: RecentBooking[];
};

const Ctx = createContext<AdminTenantCtx | null>(null);

export function useAdminTenant() {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useAdminTenant must be used within AdminTenantProvider");
  return v;
}

export function AdminTenantProvider({
  value,
  children,
}: {
  value: AdminTenantCtx;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

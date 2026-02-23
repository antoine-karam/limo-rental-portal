import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Tenant } from "./models/tenant";

export async function getTenantSlug(): Promise<string | null> {
  const cookiesList = await cookies();
  return cookiesList.get("x-tenant-slug")?.value ?? null;
}

/**
 * Resolve the full tenant record from the slug.
 * Throws if the tenant is not found or inactive.
 */
export async function getTenant(): Promise<Tenant | null> {
  const slug = await getTenantSlug();
  if (!slug) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, active: true },
  });
  if (!tenant) return null;
  return tenant;
}

/**
 * Like getTenant() but throws a 404-style error if not found.
 * Use in layouts that require a valid tenant.
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getTenant();
  if (!tenant) {
    throw new Error("Tenant not found or inactive");
  }
  return tenant;
}

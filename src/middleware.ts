/* eslint-disable @typescript-eslint/no-explicit-any */
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

function getTenantSlug(hostname: string) {
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`)
    return null;

  const subdomain = hostname
    .replace(`.${ROOT_DOMAIN}`, "")
    .replace(`.localhost`, "");

  if (!subdomain || subdomain === "www" || subdomain === "app") return null;
  return subdomain;
}

const PUBLIC_PATHS = ["/", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

const authMiddleware = withAuth(
  async function middleware(request: NextRequest) {
    return NextResponse.next();
  },
  {
    publicPaths: ["/", "/auth/:path*", "/api/auth/:path*"],
  },
);

export default async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const tenantSlug = getTenantSlug(hostname);
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    const res = NextResponse.next();
    if (tenantSlug) {
      res.cookies.set("x-tenant-slug", tenantSlug, {
        path: "/",
        sameSite: "lax",
      });
    }
    return res;
  }

  const authResponse = await (authMiddleware as any)(request, {} as any);

  if (tenantSlug && authResponse) {
    console.log("Setting tenant slug cookie for tenant:", tenantSlug);
    authResponse.cookies.set("x-tenant-slug", tenantSlug, {
      path: "/",
      sameSite: "lax",
    });
  }

  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

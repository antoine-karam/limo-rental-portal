import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

function getTenantSlug(hostname: string) {
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return null;

  const subdomain = hostname
    .replace(`.${ROOT_DOMAIN}`, "")
    .replace(`.localhost`, "");

  if (!subdomain || subdomain === "www" || subdomain === "app") return null;
  return subdomain;
}

export default withAuth(
  async function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") ?? "";
    const tenantSlug = getTenantSlug(hostname);

    const res = NextResponse.next();

    if (tenantSlug) {
      res.cookies.set("x-tenant-slug", tenantSlug);
    }

    return res;
  },
  {
    publicPaths: ["/", "/auth/:path*"],
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
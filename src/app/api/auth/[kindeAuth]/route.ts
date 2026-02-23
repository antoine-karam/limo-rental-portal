import { NextRequest } from "next/server";

import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";

export const runtime = "nodejs";
function getSiteUrl(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return process.env.KINDE_SITE_URL ?? process.env.NEXT_PUBLIC_KINDE_SITE_URL;
  }

  return `${protocol}://${host}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kindeAuth: string }> },
) {
  const { kindeAuth } = await params;

  return handleAuth(request, kindeAuth, {
    config: {
      siteUrl: getSiteUrl(request),
    },
  }) as unknown as Response;
}

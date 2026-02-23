import { NextRequest, NextResponse } from "next/server";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { getTenant } from "@/server/tenants";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  serializeUserSessionMetadata,
} from "@/server/user-session";
import {
  createOrUpdateUserFromAuth,
  getUserMetadataByEmail,
} from "@/server/users";

export const runtime = "nodejs";

function getRequestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return new URL(request.url).origin;
  }

  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const flow = request.nextUrl.searchParams.get("flow");
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();
  const origin = getRequestOrigin(request);

  if (!kindeUser?.email || !kindeUser.id) {
    return NextResponse.redirect(new URL("/auth/sign-in", origin));
  }

  const tenant = await getTenant();

  if (flow === "signup") {
    await createOrUpdateUserFromAuth({
      id: kindeUser.id,
      email: kindeUser.email,
      givenName: kindeUser.given_name,
      familyName: kindeUser.family_name,
      picture: kindeUser.picture,
      tenantId: tenant?.id,
    });
  }

  let userMetadata = await getUserMetadataByEmail(kindeUser.email);

  if (!userMetadata) {
    await createOrUpdateUserFromAuth({
      id: kindeUser.id,
      email: kindeUser.email,
      givenName: kindeUser.given_name,
      familyName: kindeUser.family_name,
      picture: kindeUser.picture,
      tenantId: tenant?.id,
    });

    userMetadata = await getUserMetadataByEmail(kindeUser.email);
  }

  const response = NextResponse.redirect(new URL("/", origin));

  if (userMetadata) {
    response.cookies.set(
      SESSION_COOKIE_NAME,
      serializeUserSessionMetadata(userMetadata),
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MAX_AGE,
      }
    );
  }

  return response;
}

import { cookies } from "next/headers";

import { SessionUserMetadata } from "@/server/users";

export const SESSION_COOKIE_NAME = "x-user-metadata";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function serializeUserSessionMetadata(metadata: SessionUserMetadata) {
  return Buffer.from(JSON.stringify(metadata)).toString("base64url");
}

export async function getUserSessionMetadata(): Promise<SessionUserMetadata | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedData = Buffer.from(sessionCookie, "base64url").toString("utf-8");
    return JSON.parse(decodedData) as SessionUserMetadata;
  } catch {
    return null;
  }
}

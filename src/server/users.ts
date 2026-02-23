import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SessionUserMetadata, SyncAuthUserInput } from "./models/user";

export const SESSION_COOKIE_NAME = "x-user-metadata";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;


export async function createOrUpdateUserFromAuth(input: SyncAuthUserInput) {
  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      id: input.id,
      email: input.email,
      firstName: input.givenName,
      lastName: input.familyName,
      avatarUrl: input.picture,
      tenantId: input.tenantId ?? null,
      role: "END_USER",
    },
    update: {
      firstName: input.givenName,
      lastName: input.familyName,
      avatarUrl: input.picture,
      tenantId: input.tenantId ?? null,
    },
  });
}

export async function getUserMetadataByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenantId: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return null;
  }

  return user satisfies SessionUserMetadata;
}

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
    const decodedData = Buffer.from(sessionCookie, "base64url").toString(
      "utf-8",
    );
    return JSON.parse(decodedData) as SessionUserMetadata;
  } catch {
    return null;
  }
}

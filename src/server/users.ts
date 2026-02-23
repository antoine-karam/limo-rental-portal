import { prisma } from "@/lib/prisma";
type SyncAuthUserInput = {
  id: string;
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
  tenantId?: string | null;
};

export type SessionUserMetadata = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "END_USER" | "DRIVER" | "ADMIN" | "SUPER_ADMIN";
  tenantId: string | null;
  avatarUrl: string | null;
};

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

export interface SyncAuthUserInput {
  id: string;
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
  tenantId?: string | null;
}

export interface SessionUserMetadata {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "END_USER" | "DRIVER" | "ADMIN" | "SUPER_ADMIN";
  tenantId: string | null;
  avatarUrl: string | null;
}

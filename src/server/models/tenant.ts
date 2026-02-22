import { JsonObject, JsonValue } from "@prisma/client/runtime/client";

export interface Tenant {
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
  geoRestrictionEnabled: boolean;
  geoRestrictionType: GeoRestrictionType | null;
  geoRestrictionValue: JsonValue;
  active: boolean;
}
export const GeoRestrictionType = {
  STATE: 'STATE',
  RADIUS: 'RADIUS',
  POLYGON: 'POLYGON'
} as const

export type GeoRestrictionType = (typeof GeoRestrictionType)[keyof typeof GeoRestrictionType]
import { DateRangeFilter } from "@/server/models/booking";
import {
  PolygonRestriction,
  RadiusRestriction,
  StateRestriction,
} from "@/server/models/tenant";
import { JsonValue } from "@prisma/client/runtime/client";

export function buildVehicleDescription(
  name: string,
  type: string,
  make?: string | null,
  model?: string | null,
  year?: number | null,
  capacity?: number,
  color?: string | null,
  amenities?: Record<string, boolean>,
): string {
  const parts: string[] = [];

  const titleBits = [year, make, model].filter(Boolean).join(" ");
  if (titleBits) {
    parts.push(`${titleBits} ${type}`);
  } else {
    parts.push(`${name} (${type})`);
  }

  parts.push(
    `Seats up to ${capacity} passenger${capacity && capacity > 1 ? "s" : ""}`,
  );

  if (color) {
    parts.push(`Color: ${color}`);
  }

  const enabledAmenities = Object.entries(amenities ?? {})
    .filter(([_, value]) => value === true)
    .map(([key]) => formatAmenityLabel(key));

  if (enabledAmenities.length) {
    parts.push(`Amenities: ${enabledAmenities.join(", ")}`);
  }

  return parts.join(" • ");
}

function formatAmenityLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function parseAmenities(
  value: JsonValue | null | undefined,
): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const result: Record<string, boolean> = {};

  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "boolean") result[k] = v;
  }

  return result;
}

export function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function getDateRangeFilter(
  filter: DateRangeFilter,
): { gte: Date; lt: Date } | undefined {
  const now = new Date();

  if (filter === "today") {
    return {
      gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  }
  if (filter === "week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return { gte: startOfWeek, lt: new Date() };
  }
  if (filter === "month") {
    return {
      gte: new Date(now.getFullYear(), now.getMonth(), 1),
      lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  return undefined;
}

type FormatToken = "yyyy" | "MM" | "dd" | "HH" | "mm" | "ss";

export function formatDate(
  date: Date | string | number,
  pattern: string,
): string {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    throw new Error("Invalid date");
  }

  const map: Record<FormatToken, string> = {
    yyyy: d.getFullYear().toString(),
    MM: String(d.getMonth() + 1).padStart(2, "0"),
    dd: String(d.getDate()).padStart(2, "0"),
    HH: String(d.getHours()).padStart(2, "0"),
    mm: String(d.getMinutes()).padStart(2, "0"),
    ss: String(d.getSeconds()).padStart(2, "0"),
  };

  return pattern.replace(
    /yyyy|MM|dd|HH|mm|ss/g,
    (match) => map[match as FormatToken],
  );
}

export function haversineKm(
  pointA: { lat: number; lng: number },
  pointB: { lat: number; lng: number },
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLng = toRad(pointB.lng - pointA.lng);
  const latA = toRad(pointA.lat);
  const latB = toRad(pointB.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(latA) * Math.cos(latB);

  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsidePolygon(
  lat: number,
  lng: number,
  coordinates: [number, number][],
) {
  let inside = false;
  for (
    let index = 0, previous = coordinates.length - 1;
    index < coordinates.length;
    previous = index++
  ) {
    const xi = coordinates[index][0];
    const yi = coordinates[index][1];
    const xj = coordinates[previous][0];
    const yj = coordinates[previous][1];

    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function getStateCode(
  place: google.maps.places.PlaceResult,
): string | null {
  const components = place.address_components;
  if (!components) return null;
  const adminArea = components.find((component) =>
    component.types.includes("administrative_area_level_1"),
  );
  return adminArea?.short_name ?? null;
}

export function parseStateRestriction(value: unknown): StateRestriction | null {
  if (!value || typeof value !== "object" || !("states" in value)) return null;
  const states = (value as { states: unknown }).states;
  if (!Array.isArray(states)) return null;
  const parsedStates = states.filter((state) => typeof state === "string");
  return { states: parsedStates };
}

export function parseRadiusRestriction(
  value: unknown,
): RadiusRestriction | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { lat?: unknown; lng?: unknown; km?: unknown };
  if (
    typeof v.lat !== "number" ||
    typeof v.lng !== "number" ||
    typeof v.km !== "number"
  )
    return null;
  return { lat: v.lat, lng: v.lng, km: v.km };
}

export function parsePolygonRestriction(
  value: unknown,
): PolygonRestriction | null {
  if (!value || typeof value !== "object" || !("coordinates" in value))
    return null;
  const coordinates = (value as { coordinates: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return null;

  const parsed: [number, number][] = [];
  for (const coordinate of coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) continue;
    const lng = coordinate[0];
    const lat = coordinate[1];
    if (typeof lng === "number" && typeof lat === "number")
      parsed.push([lng, lat]);
  }

  return parsed.length >= 3 ? { coordinates: parsed } : null;
}

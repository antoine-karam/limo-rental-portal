import { DateRangeFilter } from "@/server/models/booking";
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

export function getDateRangeFilter(filter: DateRangeFilter): { gte: Date; lt: Date } | undefined {
  const now = new Date();

  if (filter === 'today') {
    return {
      gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      lt:  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  }
  if (filter === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return { gte: startOfWeek, lt: new Date() };
  }
  if (filter === 'month') {
    return {
      gte: new Date(now.getFullYear(), now.getMonth(), 1),
      lt:  new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  return undefined;
}
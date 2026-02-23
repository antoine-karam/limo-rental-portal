import { getAllBookings } from "@/server/booking";
import { BookingStatusFilter, DateRangeFilter } from "@/server/models/booking";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const tenantId = searchParams.get("tenantId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const dateRange = searchParams.get("dateRange") ?? undefined;
  const limit = searchParams.get("limit")
    ? Number(searchParams.get("limit"))
    : undefined;
  const offset = searchParams.get("offset")
    ? Number(searchParams.get("offset"))
    : undefined;
  const bookings = await getAllBookings({
    tenantId,
    search,
    status: status as BookingStatusFilter | undefined,
    dateRange: dateRange as DateRangeFilter | undefined,
    limit,
    offset,
  });

  return new Response(JSON.stringify(bookings), {
    headers: { "Content-Type": "application/json" },
  });
}

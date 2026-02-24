import { prisma } from "@/lib/prisma";

export default async function ConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { vehicle: true, payment: true } });

  if (!booking) {
    return <div style={{ padding: "2rem" }}>Booking not found.</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 760, margin: "0 auto" }}>
      <h1>Booking confirmed</h1>
      <p>Reference: <strong>{booking.id.slice(0, 6).toUpperCase()}</strong></p>
      <p>Vehicle: {booking.vehicle.name}</p>
      <p>Scheduled time: {new Date(booking.scheduledAt).toLocaleString()}</p>
      <p>Total charged: ${Number(booking.payment?.amount ?? booking.quotedPrice).toFixed(2)}</p>
    </div>
  );
}

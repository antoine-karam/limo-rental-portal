import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { BookingStatus, RideType } from "@/generated/prisma/client";

type CreateBookingBody = {
  tenantId?: string;
  user?: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
  vehicleId: string;
  rideType: RideType;
  scheduledAt: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  durationHours?: number;
  distanceKm?: number;
  quotedPrice: number;
  notes?: string;
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function POST(request: Request) {
  const body = (await request.json()) as CreateBookingBody;

  const tenantId =
    body.tenantId ?? (await prisma.tenant.findFirst({ where: { active: true }, select: { id: true } }))?.id;

  if (!tenantId) return Response.json({ message: "Tenant is required" }, { status: 400 });

  const email = body.user?.email;
  if (!email) return Response.json({ message: "User email is required" }, { status: 400 });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        email,
        phone: body.user?.phone,
        firstName: body.user?.firstName,
        lastName: body.user?.lastName,
        isGuest: true,
      },
    }));

  const booking = await prisma.booking.create({
    data: {
      tenantId,
      userId: user.id,
      vehicleId: body.vehicleId,
      rideType: body.rideType,
      status: BookingStatus.PENDING,
      scheduledAt: new Date(body.scheduledAt),
      pickupAddress: body.pickupAddress,
      pickupLat: body.pickupLat,
      pickupLng: body.pickupLng,
      dropoffAddress: body.dropoffAddress,
      dropoffLat: body.dropoffLat,
      dropoffLng: body.dropoffLng,
      durationHours: body.durationHours,
      distanceKm: body.distanceKm,
      quotedPrice: body.quotedPrice,
      currency: "USD",
      notes: body.notes,
    },
  });

  if (!stripe) {
    return Response.json({ message: "Stripe not configured", bookingId: booking.id }, { status: 500 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(body.quotedPrice * 100),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      bookingId: booking.id,
      tenantId,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      tenantId,
      stripePaymentIntentId: paymentIntent.id,
      amount: body.quotedPrice,
      currency: "USD",
    },
  });

  return Response.json({ bookingId: booking.id, clientSecret: paymentIntent.client_secret });
}

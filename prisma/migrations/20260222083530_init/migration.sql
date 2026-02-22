-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('END_USER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ON_RIDE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'SUV', 'VAN', 'SPRINTER', 'STRETCH_LIMO');

-- CreateEnum
CREATE TYPE "RideType" AS ENUM ('TO_AIRPORT', 'FROM_AIRPORT', 'HOURLY');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FLAT_RATE', 'PER_MILE', 'PER_KM', 'HOURLY');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('EN_ROUTE_TO_PICKUP', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GeoRestrictionType" AS ENUM ('STATE', 'RADIUS', 'POLYGON');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" VARCHAR(7) DEFAULT '#C9A84C',
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "geoRestrictionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "geoRestrictionType" "GeoRestrictionType",
    "geoRestrictionValue" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(30),
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'END_USER',
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseNumber" VARCHAR(100),
    "licenseExpiry" DATE,
    "status" "DriverStatus" NOT NULL DEFAULT 'OFFLINE',
    "currentLat" DECIMAL(10,8),
    "currentLng" DECIMAL(11,8),
    "rating" DECIMAL(3,2),
    "totalRides" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "VehicleType" NOT NULL,
    "make" VARCHAR(100),
    "model" VARCHAR(100),
    "year" INTEGER,
    "capacity" INTEGER NOT NULL,
    "licensePlate" VARCHAR(20),
    "color" VARCHAR(50),
    "photos" TEXT[],
    "amenities" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleType" "VehicleType",
    "rideType" "RideType" NOT NULL,
    "pricingModel" "PricingModel" NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "perUnitPrice" DECIMAL(10,4),
    "minimumHours" DECIMAL(4,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "rideType" "RideType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" DECIMAL(10,8) NOT NULL,
    "pickupLng" DECIMAL(11,8) NOT NULL,
    "dropoffAddress" TEXT,
    "dropoffLat" DECIMAL(10,8),
    "dropoffLng" DECIMAL(11,8),
    "durationHours" DECIMAL(4,2),
    "distanceKm" DECIMAL(10,4),
    "quotedPrice" DECIMAL(10,2) NOT NULL,
    "finalPrice" DECIMAL(10,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "passengerCount" INTEGER,
    "notes" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'EN_ROUTE_TO_PICKUP',
    "startedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "actualDistanceKm" DECIMAL(10,4),
    "routePolyline" TEXT,
    "driverNotes" TEXT,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "stripeChargeId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2),
    "tenantPayout" DECIMAL(10,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "refundAmount" DECIMAL(10,2),
    "refundReason" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleRating" INTEGER,
    "driverRating" INTEGER,
    "comment" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripeAccountId_key" ON "tenants"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_userId_key" ON "driver_profiles"("userId");

-- CreateIndex
CREATE INDEX "driver_profiles_tenantId_status_idx" ON "driver_profiles"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_userId_tenantId_key" ON "driver_profiles"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "vehicles_tenantId_idx" ON "vehicles"("tenantId");

-- CreateIndex
CREATE INDEX "pricing_rules_tenantId_idx" ON "pricing_rules"("tenantId");

-- CreateIndex
CREATE INDEX "bookings_tenantId_idx" ON "bookings"("tenantId");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_driverId_idx" ON "bookings"("driverId");

-- CreateIndex
CREATE INDEX "bookings_tenantId_status_idx" ON "bookings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bookings_scheduledAt_idx" ON "bookings"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "rides_bookingId_key" ON "rides"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bookingId_key" ON "payments"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeChargeId_key" ON "payments"("stripeChargeId");

-- CreateIndex
CREATE INDEX "payments_tenantId_idx" ON "payments"("tenantId");

-- CreateIndex
CREATE INDEX "payments_stripePaymentIntentId_idx" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

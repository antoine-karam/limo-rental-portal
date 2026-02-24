"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./book.module.css";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createClient } from "@supabase/supabase-js";

type RideType = "TO_AIRPORT" | "FROM_AIRPORT" | "HOURLY";
type LatLng = { lat: number; lng: number; address: string };
type Vehicle = { id: string; name: string; type: string; capacity: number; amenities: string[]; price: number; currency: string };

type Passenger = { firstName: string; lastName: string; email: string; phone: string; notes: string };

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const rideTypes: { label: string; value: RideType }[] = [
  { label: "To Airport", value: "TO_AIRPORT" },
  { label: "From Airport", value: "FROM_AIRPORT" },
  { label: "Hourly", value: "HOURLY" },
];

function PaymentForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const pay = async () => {
    if (!stripe || !elements) return;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/book/confirmation/${bookingId}` },
      redirect: "if_required",
    });

    if (!result.error) {
      window.location.href = `/book/confirmation/${bookingId}`;
    }
  };

  return <button className={styles.next} onClick={pay}>Pay now</button>;
}

export default function BookPage() {
  const [step, setStep] = useState(1);
  const [rideType, setRideType] = useState<RideType>("TO_AIRPORT");
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [hours, setHours] = useState("2");
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationText, setDurationText] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [passenger, setPassenger] = useState<Passenger>({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
  const [clientSecret, setClientSecret] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");

  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (!(window as Window & { google?: typeof google }).google?.maps || !pickupInputRef.current || !dropoffInputRef.current) return;

      const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInputRef.current);
      pickupAutocomplete.addListener("place_changed", () => {
        const place = pickupAutocomplete.getPlace();
        if (!place.geometry?.location || !place.formatted_address) return;
        setPickup({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: place.formatted_address });
      });

      const dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInputRef.current);
      dropoffAutocomplete.addListener("place_changed", () => {
        const place = dropoffAutocomplete.getPlace();
        if (!place.geometry?.location || !place.formatted_address) return;
        setDropoff({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: place.formatted_address });
      });
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}&libraries=places`;
    script.async = true;
    script.onload = initialize;
    document.body.appendChild(script);

    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!pickup || (!dropoff && rideType !== "HOURLY")) return;
    if (!window.google?.maps) return;

    const distanceMatrix = new google.maps.DistanceMatrixService();
    distanceMatrix.getDistanceMatrix(
      {
        origins: [new google.maps.LatLng(pickup.lat, pickup.lng)],
        destinations: [new google.maps.LatLng((dropoff ?? pickup).lat, (dropoff ?? pickup).lng)],
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status !== "OK" || !response?.rows[0]?.elements[0]) return;
        const element = response.rows[0].elements[0];
        if (!element.distance || !element.duration) return;
        setDistanceKm(element.distance.value / 1000);
        setDurationText(element.duration.text);
      },
    );

    if (mapRef.current) {
      const map = new google.maps.Map(mapRef.current, { center: { lat: pickup.lat, lng: pickup.lng }, zoom: 11 });
      const directions = new google.maps.DirectionsService();
      const renderer = new google.maps.DirectionsRenderer();
      renderer.setMap(map);
      if (dropoff) {
        directions.route({ origin: pickup.address, destination: dropoff.address, travelMode: google.maps.TravelMode.DRIVING }, (result, status) => {
          if (status === "OK" && result) renderer.setDirections(result);
        });
      }
    }
  }, [pickup, dropoff, rideType]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/bookings/profile", { headers: { Authorization: `Bearer ${token}` } });
      const data = (await response.json()) as { profile: Partial<Passenger> | null };
      if (!data.profile) return;
      setPassenger((prev) => ({ ...prev, ...data.profile, notes: prev.notes }));
    };
    void loadProfile();
  }, []);

  const step1Valid = Boolean(pickup && scheduledDate && scheduledTime && (rideType === "HOURLY" ? Number(hours) > 0 : dropoff));
  const step2Valid = Boolean(selectedVehicle);
  const step3Valid = Boolean(passenger.firstName && passenger.email);

  const fetchVehicles = async () => {
    const response = await fetch("/api/bookings/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideType, distanceKm, distanceMiles: distanceKm * 0.621371, durationHours: Number(hours) }),
    });
    const data = (await response.json()) as { tenantId: string; vehicles: Vehicle[] };
    setTenantId(data.tenantId);
    setVehicles(data.vehicles);
  };

  const createBooking = async () => {
    if (!selectedVehicle || !pickup) return;
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    const response = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        user: passenger,
        vehicleId: selectedVehicle.id,
        rideType,
        scheduledAt,
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffAddress: dropoff?.address,
        dropoffLat: dropoff?.lat,
        dropoffLng: dropoff?.lng,
        durationHours: rideType === "HOURLY" ? Number(hours) : undefined,
        distanceKm,
        quotedPrice: selectedVehicle.price,
        notes: passenger.notes,
      }),
    });
    const data = (await response.json()) as { bookingId: string; clientSecret: string };
    setBookingId(data.bookingId);
    setClientSecret(data.clientSecret);
  };

  const summaryTime = useMemo(() => (scheduledDate && scheduledTime ? `${scheduledDate} ${scheduledTime}` : "-") , [scheduledDate, scheduledTime]);

  return (
    <div className={styles.container}>
      <div className={styles.steps}>{["Ride", "Vehicle", "Passenger", "Payment"].map((label, index) => <span key={label} className={`${styles.stepLabel} ${step === index + 1 ? styles.active : ""}`}>{label}</span>)}</div>
      <div className={styles.layout}>
        <div className={styles.panel}>
          {step === 1 && (
            <>
              <h2>Ride details</h2>
              <div className={styles.cards}>{rideTypes.map((type) => <button key={type.value} className={`${styles.card} ${rideType === type.value ? styles.cardSelected : ""}`} onClick={() => setRideType(type.value)}>{type.label}</button>)}</div>
              <div className={styles.field}><label>Pickup address</label><input ref={pickupInputRef} placeholder="Pickup" /></div>
              {rideType !== "HOURLY" ? <div className={styles.field}><label>Dropoff address</label><input ref={dropoffInputRef} placeholder="Dropoff" /></div> : <div className={styles.field}><label>Duration (hours)</label><select value={hours} onChange={(event) => setHours(event.target.value)}>{[1,2,3,4,5,6,8,10,12].map((hour) => <option key={hour} value={hour}>{hour}h</option>)}</select></div>}
              <div className={styles.field}><label>Date</label><input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
              <div className={styles.field}><label>Time</label><input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} /></div>
              {distanceKm > 0 && <div className={styles.banner}>Estimated {distanceKm.toFixed(1)} km · {durationText}</div>}
              <button className={`${styles.next} ${styles.desktopNext}`} disabled={!step1Valid} onClick={() => { void fetchVehicles(); setStep(2); }}>Next</button>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Select a vehicle</h2>
              <div className={styles.cards}>{vehicles.map((vehicle) => <button key={vehicle.id} className={`${styles.card} ${selectedVehicle?.id === vehicle.id ? styles.cardSelected : ""}`} onClick={() => setSelectedVehicle(vehicle)}><strong>{vehicle.name}</strong><div>{vehicle.type} · {vehicle.capacity} pax</div><div>{vehicle.amenities.join(", ") || "Standard amenities"}</div><div>${vehicle.price.toFixed(2)}</div></button>)}</div>
              <button className={`${styles.next} ${styles.desktopNext}`} disabled={!step2Valid} onClick={() => setStep(3)}>Next</button>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Passenger details</h2>
              {(["firstName","lastName","email","phone"] as const).map((field) => <div className={styles.field} key={field}><label>{field}</label><input value={passenger[field]} onChange={(event) => setPassenger((prev) => ({ ...prev, [field]: event.target.value }))} /></div>)}
              <div className={styles.field}><label>Notes</label><input value={passenger.notes} onChange={(event) => setPassenger((prev) => ({ ...prev, notes: event.target.value }))} /></div>
              <button className={`${styles.next} ${styles.desktopNext}`} disabled={!step3Valid} onClick={() => { void createBooking(); setStep(4); }}>Next</button>
            </>
          )}
          {step === 4 && clientSecret && (
            <>
              <h2>Payment</h2>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentElement />
                <PaymentForm bookingId={bookingId} />
              </Elements>
            </>
          )}
        </div>
        <div className={styles.panel}>
          {step === 1 ? <div ref={mapRef} style={{ width: "100%", minHeight: 420 }} /> : <div className={styles.summary}><h3>Booking summary</h3><div>Vehicle: {selectedVehicle?.name ?? "-"}</div><div>Ride: {rideType}</div><div>Pickup: {pickup?.address ?? "-"}</div><div>Date & time: {summaryTime}</div><div>Estimated price: {selectedVehicle ? `$${selectedVehicle.price.toFixed(2)}` : "-"}</div></div>}
        </div>
      </div>
      <div className={styles.stickyBar}>
        {step < 4 && <button className={styles.next} disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid) || (step === 3 && !step3Valid)} onClick={() => {
          if (step === 1) { void fetchVehicles(); setStep(2); }
          if (step === 2) setStep(3);
          if (step === 3) { void createBooking(); setStep(4); }
        }}>Next</button>}
      </div>
    </div>
  );
}

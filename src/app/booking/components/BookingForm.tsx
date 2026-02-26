"use client";

import { MapPin, Users, Briefcase, Clock3 } from "lucide-react";
import styles from "../booking.module.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatDate,
  getStateCode,
  haversineKm,
  isInsidePolygon,
  parsePolygonRestriction,
  parseRadiusRestriction,
  parseStateRestriction,
} from "@/lib/helper";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  GeoRestrictionType,
  PricingModel,
  RideType,
} from "@/server/models/enums";
import type { BookingVehicleOption } from "../types";

type RestrictionProps = {
  geoRestrictionEnabled: boolean;
  geoRestrictionType: GeoRestrictionType | null;
  geoRestrictionValue: unknown;
};
type PlaceValue = { address: string; lat: number; lng: number };

const RIDE_TYPES: { value: RideType; label: string }[] = [
  { value: "TO_AIRPORT", label: "To Airport" },
  { value: "FROM_AIRPORT", label: "From Airport" },
  { value: "HOURLY", label: "Hourly" },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatMoney(value: number) {
  return CURRENCY_FORMATTER.format(value);
}

function parseDistanceMiles(distanceLabel: string) {
  const value = Number.parseFloat(distanceLabel.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function buildEstimatedPrice(
  vehicle: BookingVehicleOption,
  rideType: RideType,
  miles: number,
  hours: number,
) {
  const rule = vehicle.pricingByRideType[rideType];
  if (!rule) return null;

  let total = rule.basePrice;

  if (rule.pricingModel === PricingModel.PER_MILE) {
    total += (rule.perUnitPrice ?? 0) * miles;
  }

  if (rule.pricingModel === PricingModel.PER_KM) {
    total += (rule.perUnitPrice ?? 0) * (miles * 1.60934);
  }

  if (rule.pricingModel === PricingModel.HOURLY) {
    const billableHours = Math.max(hours, rule.minimumHours ?? 0);
    total += (rule.perUnitPrice ?? 0) * billableHours;
  }

  return {
    total,
    breakdown:
      rule.pricingModel === PricingModel.FLAT_RATE
        ? `Flat rate ${formatMoney(rule.basePrice)}`
        : rule.pricingModel === PricingModel.PER_MILE
          ? `${formatMoney(rule.basePrice)} + ${formatMoney(rule.perUnitPrice ?? 0)}/mile`
          : rule.pricingModel === PricingModel.PER_KM
            ? `${formatMoney(rule.basePrice)} + ${formatMoney(rule.perUnitPrice ?? 0)}/km`
            : `${formatMoney(rule.basePrice)} + ${formatMoney(rule.perUnitPrice ?? 0)}/hr`,
  };
}

export const BookingForm: React.FC<
  { initialStep: number; vehicles: BookingVehicleOption[] } & RestrictionProps
> = ({
  initialStep = 0,
  vehicles,
  geoRestrictionEnabled,
  geoRestrictionType,
  geoRestrictionValue,
}) => {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [rideType, setRideType] = useState<RideType>("TO_AIRPORT");
  const [pickup, setPickup] = useState<PlaceValue | null>(null);
  const [dropoff, setDropoff] = useState<PlaceValue | null>(null);
  const [hours, setHours] = useState("2");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [luggage, setLuggage] = useState("0");
  const [childSeats, setChildSeats] = useState("0");
  const [distanceLabel, setDistanceLabel] = useState("");
  const [durationLabel, setDurationLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(() =>
    Date.now(),
  );

  const mapRef = useRef<HTMLDivElement | null>(null);
  const pickupRef = useRef<HTMLInputElement | null>(null);
  const dropoffRef = useRef<HTMLInputElement | null>(null);

  const handleNext = useCallback(() => {
    const next = step + 1;
    setStep(next);
    router.push(`?step=${next}`, { scroll: false });
  }, [step, router]);

  const handlePrevious = useCallback(() => {
    const previous = Math.max(step - 1, 0);
    setStep(previous);
    router.push(`?step=${previous}`, { scroll: false });
  }, [step, router]);

  const dateTimeValid = useMemo(() => {
    if (!scheduledDate || !scheduledTime) return false;
    const selected = new Date(`${scheduledDate}T${scheduledTime}`);
    return selected.getTime() > currentTimestamp;
  }, [scheduledDate, scheduledTime, currentTimestamp]);

  const step0Valid = useMemo(() => {
    if (!pickup || !dateTimeValid) return false;
    if (rideType === "HOURLY") return Number(hours) > 0;
    return Boolean(dropoff);
  }, [pickup, dateTimeValid, rideType, hours, dropoff]);

  const distanceMiles = useMemo(
    () => parseDistanceMiles(distanceLabel),
    [distanceLabel],
  );

  const bookingSummary = useMemo(
    () => ({
      pickup: pickup?.address ?? "Not set",
      dropoff: rideType === "HOURLY" ? "Hourly ride" : (dropoff?.address ?? "Not set"),
      date: scheduledDate || "Not set",
      time: scheduledTime || "Not set",
      passengers,
      distance:
        rideType === "HOURLY"
          ? "Calculated after trip"
          : (distanceLabel || "Not set"),
      duration:
        rideType === "HOURLY"
          ? `${hours} hours`
          : (durationLabel || "Not set"),
    }),
    [pickup, dropoff, scheduledDate, scheduledTime, passengers, distanceLabel, durationLabel, rideType, hours],
  );

  //init
  useEffect(() => {
    const interval = window.setInterval(
      () => setCurrentTimestamp(Date.now()),
      60000,
    );
    return () => window.clearInterval(interval);
  }, []);

  //geo restriction & map
  useEffect(() => {
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) return;

    const onLoad = () => {
      if (!window.google?.maps || !pickupRef.current || !dropoffRef.current)
        return;

      const applyRestriction = (place: google.maps.places.PlaceResult) => {
        if (!geoRestrictionEnabled || !geoRestrictionType) return true;
        if (!place.geometry?.location) return false;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        if (geoRestrictionType === GeoRestrictionType.STATE) {
          const stateRestriction = parseStateRestriction(geoRestrictionValue);
          const stateCode = getStateCode(place);
          return Boolean(
            stateRestriction &&
              stateCode &&
              stateRestriction.states.includes(stateCode),
          );
        }

        if (geoRestrictionType === GeoRestrictionType.RADIUS) {
          const radiusRestriction = parseRadiusRestriction(geoRestrictionValue);
          if (!radiusRestriction) return false;
          return (
            haversineKm(
              { lat, lng },
              { lat: radiusRestriction.lat, lng: radiusRestriction.lng },
            ) <= radiusRestriction.km
          );
        }

        if (geoRestrictionType === GeoRestrictionType.POLYGON) {
          const polygonRestriction =
            parsePolygonRestriction(geoRestrictionValue);
          if (!polygonRestriction) return false;
          return isInsidePolygon(lat, lng, polygonRestriction.coordinates);
        }

        return true;
      };

      const pickupAutocomplete = new google.maps.places.Autocomplete(
        pickupRef.current,
      );
      pickupAutocomplete.addListener("place_changed", () => {
        const place = pickupAutocomplete.getPlace();
        if (!place.formatted_address || !place.geometry?.location) return;

        if (!applyRestriction(place)) {
          setError("Pickup location is outside the tenant service area.");
          setPickup(null);
          pickupRef.current!.value = "";
          return;
        }

        setError(null);
        setPickup({
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      });

      const dropoffAutocomplete = new google.maps.places.Autocomplete(
        dropoffRef.current,
      );
      dropoffAutocomplete.addListener("place_changed", () => {
        const place = dropoffAutocomplete.getPlace();
        if (!place.formatted_address || !place.geometry?.location) return;

        if (!applyRestriction(place)) {
          setError("Dropoff location is outside the tenant service area.");
          setDropoff(null);
          dropoffRef.current!.value = "";
          return;
        }

        setError(null);
        setDropoff({
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      });
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
    script.async = true;
    script.onload = onLoad;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [geoRestrictionEnabled, geoRestrictionType, geoRestrictionValue]);

  //map & distance
  useEffect(() => {
    if (
      !pickup ||
      (!dropoff && rideType !== "HOURLY") ||
      !window.google?.maps ||
      !mapRef.current
    ) {
      return;
    }

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: pickup.lat, lng: pickup.lng },
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    if (rideType === "HOURLY" || !dropoff) {
      new google.maps.Marker({
        map,
        position: { lat: pickup.lat, lng: pickup.lng },
      });
      return;
    }

    const matrixService = new google.maps.DistanceMatrixService();
    matrixService.getDistanceMatrix(
      {
        origins: [new google.maps.LatLng(pickup.lat, pickup.lng)],
        destinations: [new google.maps.LatLng(dropoff.lat, dropoff.lng)],
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status !== "OK") return;
        const element = response?.rows[0]?.elements[0];
        if (!element?.distance?.text || !element?.duration?.text) return;
        setDistanceLabel(element.distance.text);
        setDurationLabel(element.duration.text);
      },
    );

    const routeService = new google.maps.DirectionsService();
    const routeRenderer = new google.maps.DirectionsRenderer();
    routeRenderer.setMap(map);
    routeService.route(
      {
        origin: pickup.address,
        destination: dropoff.address,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) routeRenderer.setDirections(result);
      },
    );
  }, [pickup, dropoff, rideType]);

  return (
    <div className={styles.formGrid}>
      <div className={styles.formMain}>
        {step === 0 && (
          <div className={styles.stepCard}>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rideType">
                  Ride type
                </label>
                <select
                  id="rideType"
                  className={styles.select}
                  value={rideType}
                  onChange={(e) => setRideType(e.target.value as RideType)}
                >
                  {RIDE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="pickupAddress">
                  Pickup Location
                </label>
                <div className={styles.inputWrap}>
                  <MapPin className={styles.inputIcon} />
                  <input
                    id="pickupAddress"
                    ref={pickupRef}
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="Enter pickup address"
                  />
                </div>
              </div>

              {rideType !== "HOURLY" ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="dropoffAddress">
                    Dropoff location
                  </label>
                  <div className={styles.inputWrap}>
                    <MapPin className={styles.inputIcon} />
                    <input
                      id="dropoffAddress"
                      ref={dropoffRef}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      placeholder="Enter dropoff address"
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="hours">
                    Duration (hours)
                  </label>
                  <select
                    id="hours"
                    className={styles.select}
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((value) => (
                      <option key={value} value={value}>
                        {value} hours
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.dateTimeGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>Pickup Date</label>
                  <input
                    type="date"
                    className={`${styles.input} ${styles.dateInput}`}
                    value={scheduledDate}
                    min={formatDate(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="time">
                    Pickup Time
                  </label>
                  <input
                    id="time"
                    type="time"
                    className={`${styles.input} ${styles.inputTime}`}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.detailsGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="passengers">
                    Passengers
                  </label>
                  <select
                    id="passengers"
                    className={styles.select}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="luggage">
                    Luggage
                  </label>
                  <select
                    id="luggage"
                    className={styles.select}
                    value={luggage}
                    onChange={(e) => setLuggage(e.target.value)}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="childSeats">
                    Child Seats
                  </label>
                  <select
                    id="childSeats"
                    className={styles.select}
                    value={childSeats}
                    onChange={(e) => setChildSeats(e.target.value)}
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {rideType !== "HOURLY" &&
              dropoff &&
              distanceLabel &&
              durationLabel && (
                <p className={styles.info}>
                  Estimated {distanceLabel} • {durationLabel}
                </p>
              )}
            {!dateTimeValid && scheduledDate && scheduledTime && (
              <p className={styles.error}>
                Date and time must be in the future.
              </p>
            )}
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.stepFooter}>
              <button
                className={styles.btnPrimary}
                onClick={handleNext}
                disabled={!step0Valid}
              >
                Continue to Vehicle Selection
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <div className={styles.stepCard}>
              <h3 className={styles.stepTitle}>Select Your Vehicle</h3>
              <p className={styles.stepSubtitle}>Choose from our premium fleet</p>
            </div>
            <div className={styles.vehicleGrid}>
              {vehicles.map((vehicle) => {
                const estimated = buildEstimatedPrice(
                  vehicle,
                  rideType,
                  distanceMiles,
                  Number(hours),
                );
                const selected = selectedVehicleId === vehicle.id;

                return (
                  <article
                    key={vehicle.id}
                    className={`${styles.vehicleCard} ${selected ? styles.vehicleCardSelected : ""}`}
                  >
                    {vehicle.imageUrl ? (
                      <Image
                        src={vehicle.imageUrl}
                        alt={vehicle.name}
                        className={styles.vehicleImage}
                        width={640}
                        height={360}
                      />
                    ) : (
                      <div className={styles.vehicleImagePlaceholder}>No image</div>
                    )}

                    <div className={styles.vehicleBody}>
                      <h4 className={styles.vehicleName}>{vehicle.name}</h4>
                      <p className={styles.vehicleMeta}>
                        {[vehicle.make, vehicle.model, vehicle.year]
                          .filter(Boolean)
                          .join(" • ") || "Premium class"}
                      </p>

                      <div className={styles.vehicleStats}>
                        <span>
                          <Users size={14} /> {vehicle.capacity}
                        </span>
                        <span>
                          <Briefcase size={14} /> {luggage} bags
                        </span>
                        <span>
                          <Clock3 size={14} /> {rideType === "HOURLY" ? `${hours}h` : (durationLabel || "ETA")}
                        </span>
                      </div>

                      <div className={styles.priceBox}>
                        <p className={styles.priceLabel}>Estimated total</p>
                        <p className={styles.priceValue}>
                          {estimated ? formatMoney(estimated.total) : "Not available"}
                        </p>
                        {estimated && (
                          <p className={styles.priceHint}>{estimated.breakdown}</p>
                        )}
                      </div>

                      <button
                        className={styles.btnPrimary}
                        type="button"
                        onClick={() => setSelectedVehicleId(vehicle.id)}
                      >
                        {selected ? "Selected" : "Select Vehicle"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className={`${styles.stepCard} ${styles.summaryCardMobile}`}>
              <h3 className={styles.stepTitle}>Booking Summary</h3>
              <div className={styles.summaryRows}>
                <p><strong>Pickup:</strong> {bookingSummary.pickup}</p>
                <p><strong>Drop-off:</strong> {bookingSummary.dropoff}</p>
                <p><strong>Date:</strong> {bookingSummary.date}</p>
                <p><strong>Time:</strong> {bookingSummary.time}</p>
                <p><strong>Passengers:</strong> {bookingSummary.passengers}</p>
                <p><strong>Distance:</strong> {bookingSummary.distance}</p>
                <p><strong>Duration:</strong> {bookingSummary.duration}</p>
              </div>
            </div>
            <div className={styles.stepFooter + " " + styles.stepFooterBetween}>
              <button className={styles.btnOutline} onClick={handlePrevious}>
                Back to Trip Details
              </button>
              <button className={styles.btnPrimary} disabled={!selectedVehicleId}>
                Continue to Passenger Details
              </button>
            </div>
          </>
        )}
      </div>
      <div className={styles.formSidebar}>
        <div className={styles.stickySidebar}>
          {step === 0 && <div className={styles.map} ref={mapRef} />}
          {step === 1 && (
            <div className={styles.stepCard}>
              <h3 className={styles.stepTitle}>Booking Summary</h3>
              <div className={styles.summaryRows}>
                <p><strong>Pickup:</strong> {bookingSummary.pickup}</p>
                <p><strong>Drop-off:</strong> {bookingSummary.dropoff}</p>
                <p><strong>Date:</strong> {bookingSummary.date}</p>
                <p><strong>Time:</strong> {bookingSummary.time}</p>
                <p><strong>Passengers:</strong> {bookingSummary.passengers}</p>
                <p><strong>Distance:</strong> {bookingSummary.distance}</p>
                <p><strong>Duration:</strong> {bookingSummary.duration}</p>
                <p><strong>Est. taxes & fees:</strong> {formatMoney(0)}</p>
                <p className={styles.summaryTotal}>
                  <strong>Total:</strong>{" "}
                  {selectedVehicleId
                    ? formatMoney(
                        buildEstimatedPrice(
                          vehicles.find((vehicle) => vehicle.id === selectedVehicleId)!,
                          rideType,
                          distanceMiles,
                          Number(hours),
                        )?.total ?? 0,
                      )
                    : formatMoney(0)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

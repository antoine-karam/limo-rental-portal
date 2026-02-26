"use client";

import { MapPin } from "lucide-react";
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
import { GeoRestrictionType, RideType } from "@/server/models/enums";
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
export const BookingForm: React.FC<
  { initialStep: number } & RestrictionProps
> = ({
  initialStep = 0,
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
              {/* Ride Type */}
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
              {/* Pickup */}
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
              {/* Dropoff */}
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

              {/* Date & Time */}
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
              {/* Passengers / Luggage / Child Seats */}
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
      </div>
      <div className={styles.formSidebar}>
        <div className={styles.stickySidebar}>
          {step === 0 && <div className={styles.map} ref={mapRef} />}
        </div>
      </div>
    </div>
  );
};

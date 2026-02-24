"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Car, Pencil, Plus, Search, X } from "lucide-react";
import Image from "next/image";

import { useAdminTenant } from "@/app/admin/_providers/AdminTenantProvider";
import { VehicleType } from "@/server/models/enums";
import { FleetVehicleRow } from "@/server/models/adminFleet";

import styles from "./fleet.module.css";
import { upload } from "@vercel/blob/client";

const VEHICLE_TYPE_OPTIONS = Object.values(VehicleType);

type VehicleFormState = {
  id?: string;
  name: string;
  type: VehicleType;
  make: string;
  model: string;
  year: string;
  capacity: string;
  licensePlate: string;
  color: string;
  photoUrl: string;
  active: boolean;
};

const defaultForm: VehicleFormState = {
  name: "",
  type: VehicleType.SEDAN,
  make: "",
  model: "",
  year: "",
  capacity: "4",
  licensePlate: "",
  color: "",
  photoUrl: "",
  active: true,
};

function formatVehicleType(type: VehicleType) {
  return type.replace(/_/g, " ");
}

export default function AdminFleetPage() {
  const { tenantId } = useAdminTenant();
  const canMutate = tenantId && tenantId !== "default";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vehicles, setVehicles] = useState<FleetVehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [form, setForm] = useState<VehicleFormState>(defaultForm);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchFleet = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({ tenantId });
      if (debouncedSearch) query.set("search", debouncedSearch);

      const response = await fetch(`/api/fleet?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed request");
      }

      const data = await response.json();
      setVehicles(data.vehicles);
    } catch {
      setError("Failed to load fleet data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, debouncedSearch]);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  const activeCount = useMemo(
    () => vehicles.filter((vehicle) => vehicle.active).length,
    [vehicles],
  );

  const inactiveCount = vehicles.length - activeCount;

  const openCreate = () => {
    if (!canMutate) return;
    setForm(defaultForm);
    setDrawerOpen(true);
  };

  const openEdit = (vehicle: FleetVehicleRow) => {
    if (!canMutate) return;
    setForm({
      id: vehicle.id,
      name: vehicle.name,
      type: vehicle.type,
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      year: vehicle.year?.toString() ?? "",
      capacity: vehicle.capacity.toString(),
      licensePlate: vehicle.licensePlate ?? "",
      color: vehicle.color ?? "",
      photoUrl: vehicle.photoUrl ?? "",
      active: vehicle.active,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (isSaving) return;
    setDrawerOpen(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId || !canMutate) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        tenantId,
        capacity: Number(form.capacity),
        year: form.year ? Number(form.year) : undefined,
      };

      const method = form.id ? "PATCH" : "POST";
      const response = await fetch("/api/fleet", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Save failed");

      setDrawerOpen(false);
      setForm(defaultForm);
      await fetchFleet();
    } catch {
      setError("Failed to save vehicle. Please verify all fields.");
    } finally {
      setSaving(false);
    }
  };

  const onSelectPhoto = async (file: File | null) => {
    if (!file || !tenantId || !canMutate) return;

    setUploading(true);
    setError(null);

    try {
      const newBlob = await upload(`cars-on-spot/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads",
      });

      setForm((prev) => ({ ...prev, photoUrl: newBlob.url }));
    } catch {
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Fleet</h1>
          <p>Manage vehicles available for bookings.</p>
        </div>

        <button
          className={styles.primaryBtn}
          onClick={openCreate}
          disabled={!canMutate}
          title={
            canMutate ? "Add new vehicle" : "Select a tenant to add vehicles"
          }
        >
          <Plus />
          Add Vehicle
        </button>
      </div>

      {!canMutate && (
        <p className={styles.warningMsg}>
          Add and edit actions are disabled for the default tenant.
        </p>
      )}

      <div className={styles.filtersCard}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, make, model, or plate"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCounter}>
          <p className={styles.statCounterLabel}>Total Vehicles</p>
          <p className={styles.statCounterValue}>{vehicles.length}</p>
        </div>
        <div className={styles.statCounter}>
          <p className={styles.statCounterLabel}>Active</p>
          <p className={`${styles.statCounterValue} ${styles.success}`}>
            {activeCount}
          </p>
        </div>
        <div className={styles.statCounter}>
          <p className={styles.statCounterLabel}>Inactive</p>
          <p className={`${styles.statCounterValue} ${styles.warning}`}>
            {inactiveCount}
          </p>
        </div>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>License Plate</th>
              <th>Status</th>
              <th>Added</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  Loading fleet…
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  No fleet vehicles found.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <div className={styles.vehicleCell}>
                      <div className={styles.thumb}>
                        {vehicle.photoUrl ? (
                          <Image
                            src={vehicle.photoUrl}
                            alt={vehicle.name}
                            width={40}
                            height={40}
                            unoptimized
                          />
                        ) : (
                          <Car size={16} />
                        )}
                      </div>
                      <div>
                        <p className={styles.vehicleName}>{vehicle.name}</p>
                        <p className={styles.vehicleMeta}>
                          {[vehicle.year, vehicle.make, vehicle.model]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>{formatVehicleType(vehicle.type)}</td>
                  <td>{vehicle.capacity}</td>
                  <td>{vehicle.licensePlate ?? "—"}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${vehicle.active ? styles.badgeActive : styles.badgeInactive}`}
                    >
                      {vehicle.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {new Date(vehicle.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <button
                      className={styles.editBtn}
                      onClick={() => openEdit(vehicle)}
                      disabled={!canMutate}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className={`${styles.backdrop} ${isDrawerOpen ? styles.backdropVisible : ""}`}
        onClick={closeDrawer}
      />

      <aside
        className={`${styles.offcanvas} ${isDrawerOpen ? styles.offcanvasOpen : ""}`}
      >
        <div className={styles.offcanvasHeader}>
          <div>
            <h2>{form.id ? "Edit Vehicle" : "Add Vehicle"}</h2>
            <p>
              {form.id
                ? "Update the selected fleet vehicle."
                : "Create a new fleet vehicle."}
            </p>
          </div>
          <button className={styles.iconBtn} onClick={closeDrawer}>
            <X size={18} />
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            Vehicle Name
            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </label>

          <label>
            Type
            <select
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  type: e.target.value as VehicleType,
                }))
              }
            >
              {VEHICLE_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {formatVehicleType(type)}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.formGrid}>
            <label>
              Make
              <input
                value={form.make}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, make: e.target.value }))
                }
              />
            </label>
            <label>
              Model
              <input
                value={form.model}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, model: e.target.value }))
                }
              />
            </label>
          </div>

          <div className={styles.formGrid}>
            <label>
              Year
              <input
                type="number"
                min="1990"
                max="2100"
                value={form.year}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, year: e.target.value }))
                }
              />
            </label>
            <label>
              Capacity
              <input
                required
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, capacity: e.target.value }))
                }
              />
            </label>
          </div>

          <label>
            License Plate
            <input
              value={form.licensePlate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, licensePlate: e.target.value }))
              }
            />
          </label>

          <label>
            Color
            <input
              value={form.color}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, color: e.target.value }))
              }
            />
          </label>

          <label>
            Vehicle Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onSelectPhoto(e.target.files?.[0] ?? null)}
              disabled={isUploading}
            />
            {isUploading ? (
              <span className={styles.helperText}>Uploading image…</span>
            ) : form.photoUrl ? (
              <span className={styles.helperText}>
                Image uploaded successfully.
              </span>
            ) : (
              <span className={styles.helperText}>Upload a vehicle image.</span>
            )}
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, active: e.target.checked }))
              }
            />
            Vehicle is active
          </label>

          <button
            className={styles.primaryBtn}
            type="submit"
            disabled={isSaving || isUploading}
          >
            {isSaving
              ? "Saving..."
              : form.id
                ? "Save Changes"
                : "Create Vehicle"}
          </button>
        </form>
      </aside>
    </>
  );
}

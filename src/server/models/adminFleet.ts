import { VehicleType } from "./enums";

export interface FleetVehicleRow {
  id: string;
  name: string;
  type: VehicleType;
  make: string | null;
  model: string | null;
  year: number | null;
  capacity: number;
  licensePlate: string | null;
  color: string | null;
  active: boolean;
  photoUrl: string | null;
  createdAt: string;
}

export interface FleetListResult {
  vehicles: FleetVehicleRow[];
  total: number;
}

export interface FleetMutationInput {
  tenantId: string;
  id?: string;
  name: string;
  type: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  capacity: number;
  licensePlate?: string;
  color?: string;
  photoUrl?: string;
  active: boolean;
}

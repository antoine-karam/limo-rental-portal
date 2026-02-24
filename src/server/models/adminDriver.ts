import { DriverStatus } from "./enums";

export interface DriverRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  licenseNumber: string | null;
  status: DriverStatus | null;
  rating: number;
  totalRides: number;
  vehicleName: string | null;
}

export interface DriverListResult {
  drivers: DriverRow[];
  total: number;
  active: number;
  offDuty: number;
  avgRating: number;
}

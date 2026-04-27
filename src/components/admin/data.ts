export type MileageRange =
  | "0-50k" | "50k-100k" | "100k-150k"
  | "150k-200k" | "200k-250k" | "250k-300k" | "300k+";

export type VehicleType =
  | "4x4" | "SUV" | "Sedan" | "Estate" | "Convertible"
  | "City car" | "Cut" | "Minivan" | "Commercial vehicle";

export type EnergyType = "Petrol" | "Diesel" | "Hybrid" | "Electric";
export type GearboxType = "Manual" | "Automatic";

export interface Car {
  id: string;
  name: string;
  immatriculation: string;
  phoneNumber: string;
  description?: string | null;
  photo?: string | null;
  isCurrentlyRented?: boolean;
  isTrackingActive?: boolean;
  // Vehicle specs
  brand?: string | null;
  model?: string | null;
  finishing?: string | null;
  modelYear?: number | null;
  vehicleType?: VehicleType | null;
  energy?: EnergyType | null;
  din?: number | null;
  gearbox?: GearboxType | null;
  numberOfDoors?: number | null;
  numberOfSeats?: number | null;
  color?: string | null;
  mileage?: MileageRange | null;
  vehicleCondition?: string | null;
}

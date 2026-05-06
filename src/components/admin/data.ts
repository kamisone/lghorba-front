export type MileageRange =
  | "0-50" | "50-100" | "100-150"
  | "150-200" | "200-250" | "250-300" | "300+";

export type VehicleType =
  | "4x4" | "SUV" | "Sedan" | "Estate" | "Convertible"
  | "City car" | "Cut" | "Minivan" | "Commercial vehicle";

export type EnergyType = "Petrol" | "Diesel" | "Hybrid" | "Electric";
export type GearboxType = "Manual" | "Automatic";
export type BookingSource = "private" | "turo" | "getaround";

export interface BookingUser {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  score?: number | null;
  turoJoinDate?: string | null;
  getaroundJoinDate?: string | null;
}

export type GpsStopMode = "auto" | "manual";

export interface CalendarBooking {
  id: string;
  carId: string;
  startDateTime: string;
  endDateTime: string;
  source: BookingSource;
  status: "pending" | "confirmed" | "cancelled";
  reservationNumber?: string | null;
  totalEarning?: number | null;
  autoStartTracking: boolean;
  gpsStopMode: GpsStopMode;
  color?: string | null;
  user?: BookingUser | null;
}

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
  basePricePerDay?: number | null;
  basePricePerWeekendDay?: number | null;
  // Location & delivery
  parkingAddress?: string | null;
  parkingLat?: number | null;
  parkingLng?: number | null;
  deliveryType?: "none" | "radius" | "whitelist" | null;
  deliveryRadiusKm?: number | null;
  deliveryAddresses?: { label: string; lat: number; lng: number }[] | null;
}

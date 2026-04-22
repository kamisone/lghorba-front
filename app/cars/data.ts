export interface Car {
  id: string;
  name: string;
  immatriculation: string;
  phoneNumber: string;
  description?: string;
  photo?: string | null;
  isCurrentlyRented?: boolean;
}

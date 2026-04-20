export interface Car {
  id: string;
  name: string;
  immatriculation: string;
  phoneNumber: string;
  description?: string;
}

export const CARS: Car[] = [
  {
    id: "mazda5",
    name: "Mazda 5",
    immatriculation: "AB-123-CD",
    phoneNumber: "+33666685430",
    description: "Family minivan",
  },
  // Add more cars here
];

export function getCarById(id: string): Car | undefined {
  return CARS.find((car) => car.id === id);
}

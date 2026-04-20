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
  {
    id: "citroen_c1",
    name: "Citroen C1",
    immatriculation: "AB-123-CD",
    phoneNumber: "+33763931571",
    description: "Family minivan",
  },
  {
    id: "renault_grand_scenic",
    name: "Renault Grand Scenic",
    immatriculation: "AB-123-CD",
    phoneNumber: "+33668844245",
    description: "Family minivan",
  },
  {
    id: "ford_b_max",
    name: "Ford B-max",
    immatriculation: "AB-123-CD",
    phoneNumber: "+33760176747",
    description: "Family minivan",
  },
  {
    id: "c3_picasso",
    name: "C3 picasso",
    immatriculation: "AB-123-CD",
    phoneNumber: "+33669305434",
    description: "Family minivan",
  },
  {
    id: "peugeot_208",
    name: "Peugeot 208 Style",
    immatriculation: "AB-123-CD",
    phoneNumber: "+33663953069",
    description: "Family minivan",
  },
  // Add more cars here
];

export function getCarById(id: string): Car | undefined {
  return CARS.find((car) => car.id === id);
}

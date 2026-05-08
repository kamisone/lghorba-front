import VehicleInspections from "@/components/admin/VehicleInspections";

export default function VehicleInspectionsPage({ params }: { params: { id: string } }) {
  return <VehicleInspections carId={params.id} />;
}

import VehicleIncidents from "@/components/admin/maintenance/VehicleIncidents";

export default function VehicleIncidentsPage({ params }: { params: { id: string } }) {
  return <VehicleIncidents carId={params.id} />;
}

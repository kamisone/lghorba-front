import VehicleMaintenancePanel from "@/components/admin/VehicleMaintenancePanel";

export default function VehicleMaintenancePage({ params }: { params: { id: string } }) {
  return <VehicleMaintenancePanel carId={params.id} />;
}

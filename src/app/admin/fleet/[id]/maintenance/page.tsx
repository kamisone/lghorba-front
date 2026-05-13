import VehicleMaintenancePanel from "@/components/admin/maintenance/VehicleMaintenancePanel";

export default function VehicleMaintenancePage({ params }: { params: { id: string } }) {
  return <VehicleMaintenancePanel carId={params.id} />;
}

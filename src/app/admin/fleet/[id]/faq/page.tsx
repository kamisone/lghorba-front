import AdminVehicleFaqs from "@/components/admin/fleet/AdminVehicleFaqs";

export default function VehicleFaqPage({ params }: { params: { id: string } }) {
  return <AdminVehicleFaqs carId={params.id} />;
}

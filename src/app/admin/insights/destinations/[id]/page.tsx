import DestinationDetail from "@/components/admin/insights/DestinationDetail";

export const metadata = { robots: "noindex" };

export default function DestinationDetailPage({ params }: { params: { id: string } }) {
  return <DestinationDetail id={params.id} />;
}

import InvoiceDetail from "@/components/admin/InvoiceDetail";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  return <InvoiceDetail invoiceId={params.id} />;
}

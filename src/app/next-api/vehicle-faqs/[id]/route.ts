import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

const invalidate = (body: unknown) => {
  const carId = (body as any)?.carId ?? (body as any)?.entityId;
  if (carId) revalidateTag(`car-faqs-${carId}`);
};

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/admin/vehicle-faqs/${params.id}`);
}

export function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PUT", `/admin/vehicle-faqs/${params.id}`, { onSuccess: invalidate });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/vehicle-faqs/${params.id}`, { onSuccess: invalidate });
}

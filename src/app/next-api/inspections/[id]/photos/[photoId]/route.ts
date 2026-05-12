import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  return proxyRequest(req, "GET", `/inspections/${params.id}/photos/${params.photoId}`, {
    passRedirect: true,
  });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  return proxyRequest(req, "DELETE", `/inspections/${params.id}/photos/${params.photoId}`);
}

import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/admin/parkings/${params.id}`);
}

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/admin/parkings/${params.id}`);
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/parkings/${params.id}`);
}

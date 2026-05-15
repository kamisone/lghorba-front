import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/admin/vehicle-faqs/${params.id}`);
}

export function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PUT", `/admin/vehicle-faqs/${params.id}`);
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/vehicle-faqs/${params.id}`);
}

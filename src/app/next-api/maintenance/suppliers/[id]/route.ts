import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PUT", `/maintenance/suppliers/${params.id}`);
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/maintenance/suppliers/${params.id}`);
}

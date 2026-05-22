import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/admin/blog/posts/${params.id}`);
}

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/admin/blog/posts/${params.id}`);
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/blog/posts/${params.id}`);
}

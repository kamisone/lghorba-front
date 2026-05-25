import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/admin/shop/products/${params.id}/attributes`);
}
export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/admin/shop/products/${params.id}/attributes`);
}

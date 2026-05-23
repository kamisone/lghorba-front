import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  return proxyRequest(req, "GET", `/public/shop/products/${params.slug}`, { auth: false });
}

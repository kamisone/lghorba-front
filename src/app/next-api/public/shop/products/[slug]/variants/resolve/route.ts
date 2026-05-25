import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  return proxyRequest(req, "POST", `/public/shop/products/${params.slug}/variants/resolve`, { auth: false });
}

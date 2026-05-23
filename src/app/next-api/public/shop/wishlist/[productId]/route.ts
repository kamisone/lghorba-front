import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  return proxyRequest(req, "DELETE", `/public/shop/wishlist/${params.productId}`, { auth: false });
}

import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest, { params }: { params: { productId: string } }) =>
  proxyRequest(req, "GET", `/public/shop/reviews/product/${params.productId}`, { auth: false });

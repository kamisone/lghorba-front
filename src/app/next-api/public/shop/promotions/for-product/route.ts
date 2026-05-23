import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest) =>
  proxyRequest(req, "GET", "/public/shop/promotions/for-product", { auth: false });

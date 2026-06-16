import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest, { params }: { params: { token: string } }) =>
  proxyRequest(req, "GET", `/public/shop/checkout/resume/${params.token}`, { auth: false });

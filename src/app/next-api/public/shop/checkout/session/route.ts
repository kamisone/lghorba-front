import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest) =>
  proxyRequest(req, "GET", `/public/shop/checkout/session${req.nextUrl.search}`, { auth: false });

export const PUT = (req: NextRequest) =>
  proxyRequest(req, "PUT", "/public/shop/checkout/session", { auth: false });

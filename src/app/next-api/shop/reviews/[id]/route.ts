import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const PATCH = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "PATCH", `/admin/shop/reviews/${params.id}`);

export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/reviews/${params.id}`);

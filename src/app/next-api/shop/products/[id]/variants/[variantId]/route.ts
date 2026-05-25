import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const PATCH = (req: NextRequest, { params }: { params: { id: string; variantId: string } }) =>
  proxyRequest(req, "PATCH", `/admin/shop/products/${params.id}/variants/${params.variantId}`);

export const DELETE = (req: NextRequest, { params }: { params: { id: string; variantId: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/products/${params.id}/variants/${params.variantId}`);

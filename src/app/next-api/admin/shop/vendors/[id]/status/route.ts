import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const PATCH = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "PATCH", `/admin/shop/vendors/${params.id}/status`);

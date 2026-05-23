import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "GET", `/admin/shop/vendors/${params.id}`);

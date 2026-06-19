import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const POST = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "POST", `/admin/shop/products/${params.id}/documents/upload`);

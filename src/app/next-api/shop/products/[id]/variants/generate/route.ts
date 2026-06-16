import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/admin/shop/products/${params.id}/variants/generate`, {
    onSuccess: () => revalidateTag("products"),
  });
}

import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { variantId: string } }) {
  return proxyRequest(req, "POST", `/admin/shop/inventory/${params.variantId}/adjust`, {
    onSuccess: () => revalidateTag("products"),
  });
}

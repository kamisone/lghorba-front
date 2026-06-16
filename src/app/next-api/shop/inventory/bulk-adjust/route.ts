import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/admin/shop/inventory/bulk-adjust", {
    onSuccess: () => revalidateTag("products"),
  });
}

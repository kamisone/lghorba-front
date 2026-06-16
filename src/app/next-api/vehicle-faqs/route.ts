import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/admin/vehicle-faqs");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/admin/vehicle-faqs", {
    onSuccess: (body) => {
      const carId = (body as any)?.carId ?? (body as any)?.entityId;
      if (carId) revalidateTag(`car-faqs-${carId}`);
    },
  });
}

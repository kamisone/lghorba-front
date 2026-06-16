import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest) {
  return proxyRequest(req, "PATCH", "/admin/vehicle-faqs/reorder", {
    onSuccess: (body) => {
      // Body may be an array of FAQs or a single FAQ; extract carId from first element
      const first = Array.isArray(body) ? body[0] : body;
      const carId = (first as any)?.carId ?? (first as any)?.entityId;
      if (carId) revalidateTag(`car-faqs-${carId}`);
    },
  });
}

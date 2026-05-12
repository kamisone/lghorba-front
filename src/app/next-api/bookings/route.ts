import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/bookings");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/bookings", {
    onSuccess: (_, body) => {
      revalidateTag("cars");
      const b = body as { carId?: string } | undefined;
      if (b?.carId) revalidateTag(`availability-${b.carId}`);
    },
  });
}

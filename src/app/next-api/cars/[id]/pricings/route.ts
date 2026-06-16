import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/cars/${params.id}/pricings`);
}

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/cars/${params.id}/pricings`, {
    onSuccess: () => {
      revalidateTag(`car-${params.id}`);
      revalidateTag("cars");
    },
  });
}

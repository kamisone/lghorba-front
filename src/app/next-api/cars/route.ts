import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/cars");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/cars", {
    onSuccess: () => revalidateTag("cars"),
  });
}

import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/admin/blog/posts");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/admin/blog/posts", {
    onSuccess: () => revalidateTag("blog"),
  });
}

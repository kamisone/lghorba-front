import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { postId: string } }) {
  return proxyRequest(req, "GET", `/admin/blog/posts/${params.postId}/products`);
}

export function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  return proxyRequest(req, "POST", `/admin/blog/posts/${params.postId}/products`);
}

import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PUT(req: NextRequest, { params }: { params: { postId: string } }) {
  return proxyRequest(req, "PUT", `/admin/blog/posts/${params.postId}/products/reorder`);
}

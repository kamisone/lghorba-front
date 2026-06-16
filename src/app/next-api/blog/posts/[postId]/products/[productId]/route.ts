import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function DELETE(req: NextRequest, { params }: { params: { postId: string; productId: string } }) {
  return proxyRequest(req, "DELETE", `/admin/blog/posts/${params.postId}/products/${params.productId}`, {
    onSuccess: () => revalidateTag("blog"),
  });
}

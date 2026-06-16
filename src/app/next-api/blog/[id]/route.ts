import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

const invalidate = (body: unknown) => {
  revalidateTag("blog");
  const slug = (body as any)?.slug;
  if (slug) revalidateTag(`blog-${slug}`);
};

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/admin/blog/posts/${params.id}`);
}

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/admin/blog/posts/${params.id}`, { onSuccess: invalidate });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/blog/posts/${params.id}`, { onSuccess: invalidate });
}

import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/admin/blog/categories/${params.id}`, {
    onSuccess: () => revalidateTag("blog"),
  });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/blog/categories/${params.id}`, {
    onSuccess: () => revalidateTag("blog"),
  });
}

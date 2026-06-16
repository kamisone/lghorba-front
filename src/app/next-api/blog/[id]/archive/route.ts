import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/admin/blog/posts/${params.id}/archive`, {
    onSuccess: (body) => { revalidateTag("blog"); const slug = (body as any)?.slug; if (slug) revalidateTag(`blog-${slug}`); },
  });
}

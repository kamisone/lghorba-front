import { NextRequest } from "next/server";\nimport { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/admin/blog/posts/${params.id}/publish`);
}

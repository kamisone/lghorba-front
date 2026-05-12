import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { entityType: string; entityId: string } }) {
  return proxyRequest(req, "GET", `/translations/${params.entityType}/${params.entityId}`);
}

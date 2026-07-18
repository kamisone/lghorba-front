import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function DELETE(req: NextRequest, { params }: { params: { id: string; positionId: string } }) {
  return proxyRequest(req, "DELETE", `/rent-sessions/${params.id}/positions/${params.positionId}`);
}

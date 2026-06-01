import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/bookings/${params.id}/reactivate`);
}

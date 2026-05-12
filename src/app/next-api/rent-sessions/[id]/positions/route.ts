import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/rent-sessions/${params.id}/positions`);
}

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/rent-sessions/${params.id}/positions`);
}

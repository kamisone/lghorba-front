import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/cars/${params.id}/availability`);
}

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "POST", `/cars/${params.id}/availability`);
}

import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  if (!token) return Promise.resolve(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));

  try {
    const parts = token.split(".");
    if (parts.length < 2) throw new Error("invalid");
    const raw     = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { sub?: unknown };
    if (!payload.sub) throw new Error("no sub");
    return proxyRequest(req, "GET", `/admins/${payload.sub}`);
  } catch {
    return Promise.resolve(NextResponse.json({ error: "invalid_token" }, { status: 401 }));
  }
}

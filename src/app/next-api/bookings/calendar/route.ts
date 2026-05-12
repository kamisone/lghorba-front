import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  const carId = new URL(req.url).searchParams.get("carId");
  if (!carId) return NextResponse.json({ error: "carId is required" }, { status: 400 });
  return proxyRequest(req, "GET", "/bookings/calendar");
}

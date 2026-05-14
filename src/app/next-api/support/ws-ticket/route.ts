import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest): Response {
  const token = req.cookies.get("vitecamion_auth")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ token });
}

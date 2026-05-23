import { NextRequest, NextResponse } from "next/server";
import { proxyVendorRequest } from "@/lib/vendorProxy";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "login";
  const path = action === "register" ? "/vendor/auth/register" : "/vendor/auth/login";

  const body = await req.json().catch(() => ({}));
  const backendRes = await fetch(
    `${process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000"}${path}`,
    {
      method:  "POST",
      cache:   "no-store",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    },
  );

  const data = await backendRes.json().catch(() => ({})) as Record<string, unknown>;
  const res  = NextResponse.json(data, { status: backendRes.status });

  if (backendRes.ok && data.accessToken) {
    res.cookies.set("vitecamion_vendor_auth", data.accessToken as string, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24, // 24h
      path:     "/",
    });
  }

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("vitecamion_vendor_auth");
  return res;
}

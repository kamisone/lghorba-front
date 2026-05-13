import { NextResponse } from "next/server";

export async function POST(req: Request): Promise<Response> {
  try {
    const payload = await req.json();
    if (!payload?.message) {
      return NextResponse.json({ ok: false, error: "missing message" }, { status: 400 });
    }
    console.error("[error-report]", JSON.stringify(payload));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
}

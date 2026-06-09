import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/public/cars/${params.id}/photo`);
    if (!res.ok) return new NextResponse(null, { status: 404 });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return new NextResponse(null, { status: 404 });
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

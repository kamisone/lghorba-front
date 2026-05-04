import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

export async function GET(_req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/public/cars/${params.id}/photos/${params.photoId}`);
    if (!res.ok) return new NextResponse(null, { status: res.status });
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(res.body, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { LOCALES } from "@/lib/i18n";

const BACKEND = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

const SLUG_TO_ROUTE: Record<string, string> = {
  about:   "about",
  privacy: "privacy-policy",
  legal:   "legal",
  cookies: "cookies",
};

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; locale: string } },
) {
  try {
    const res = await fetch(
      `${BACKEND}/admin/content/${params.slug}/${params.locale}`,
      { cache: "no-store", headers: bearer(req) },
    );
    if (res.status === 404) return NextResponse.json(null);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string; locale: string } },
) {
  try {
    const body = await req.json();
    const res = await fetch(
      `${BACKEND}/admin/content/${params.slug}/${params.locale}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...bearer(req) },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    if (res.ok) {
      // Bust the Data Cache for this slug so public pages re-fetch on next request.
      revalidateTag(`content-${params.slug}`);
      // Trigger Full Route Cache revalidation for every locale.
      const route = SLUG_TO_ROUTE[params.slug];
      if (route) {
        for (const locale of LOCALES) {
          revalidatePath(`/${locale}/${route}`);
        }
      }
    }
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { LOCALES } from "@/lib/i18n";
import { proxyRequest } from "@/lib/proxy";

const SLUG_TO_ROUTE: Record<string, string> = {
  about:   "about",
  privacy: "privacy-policy",
  legal:   "legal",
  cookies: "cookies",
};

export function GET(req: NextRequest, { params }: { params: { slug: string; locale: string } }) {
  return proxyRequest(req, "GET", `/admin/content/${params.slug}/${params.locale}`);
}

export function PUT(req: NextRequest, { params }: { params: { slug: string; locale: string } }) {
  const { slug, locale } = params;
  return proxyRequest(req, "PUT", `/admin/content/${slug}/${locale}`, {
    onSuccess: () => {
      revalidateTag(`content-${slug}`);
      const route = SLUG_TO_ROUTE[slug];
      if (route) {
        for (const l of LOCALES) revalidatePath(`/${l}/${route}`);
      }
    },
  });
}

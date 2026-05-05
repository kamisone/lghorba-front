const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

export interface PageSection {
  title: string;
  body: string; // HTML from WYSIWYG editor
}

export interface PageStat {
  num: string;
  label: string;
}

export interface PageContentData {
  title: string;
  intro: string;
  sections: PageSection[];
  stats?: PageStat[]; // About page only
}

/**
 * Fetch CMS content for a static page.
 * Tagged with `content-${slug}` — call revalidateTag after admin saves.
 * Returns null if the backend has no record yet; pages fall back to translations.
 */
export async function getPageContent(
  slug: string,
  locale: string,
): Promise<PageContentData | null> {
  try {
    const res = await fetch(
      `${API}/public/content/${slug}?locale=${encodeURIComponent(locale)}`,
      { cache: "force-cache", next: { tags: [`content-${slug}`] } },
    );
    if (!res.ok) return null;
    const record = await res.json();
    return record?.data ?? null;
  } catch {
    return null;
  }
}

export const revalidate = 60;

import type { Metadata } from "next";
import BlogListing, { type Category, type Post } from "@/components/blog/BlogListing";
import { getTranslations } from "@/lib/i18n";

interface Props {
  params: { locale: string };
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";
const PAGE_SIZE = 9;

async function fetchInitialPosts(locale: string): Promise<{ items: Post[]; total: number }> {
  try {
    const params = new URLSearchParams({ locale, limit: String(PAGE_SIZE), offset: "0" });
    const res = await fetch(`${API}/public/blog/posts?${params}`, {
      next: { revalidate: 60, tags: ["blog"] },
    });
    if (!res.ok) return { items: [], total: 0 };
    return await res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API}/public/blog/categories`, {
      next: { revalidate: 60, tags: ["blog"] },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = getTranslations(params.locale).blog;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title:       "Blog — vitecamion",
      description: t.metaDescription,
      type:        "website",
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const [{ items, total }, categories] = await Promise.all([
    fetchInitialPosts(params.locale),
    fetchCategories(),
  ]);
  const featured = items.find(p => p.featured) ?? items[0] ?? null;

  return (
    <BlogListing
      locale={params.locale}
      initialPosts={items}
      initialFeatured={featured}
      initialCategories={categories}
      initialTotal={total}
    />
  );
}

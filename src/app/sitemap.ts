import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vitecamion.fr";
const API      = process.env.API_BASE_URL_SERVER  ?? "http://127.0.0.1:4000";

interface BlogPost {
  slug: string;
  locale: string;
  updatedAt: string;
}

async function fetchPublishedPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API}/public/blog/posts?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json() as { items: BlogPost[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchPublishedPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/fr`,          lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/en`,          lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/fr/fleet`,    lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/en/fleet`,    lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/fr/blog`,     lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/en/blog`,     lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/fr/contact`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map(post => ({
    url:          `${BASE_URL}/${post.locale}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "weekly" as const,
    priority:     0.7,
  }));

  return [...staticPages, ...blogPages];
}

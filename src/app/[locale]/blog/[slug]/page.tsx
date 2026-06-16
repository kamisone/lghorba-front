import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/components/blog/ArticlePage";

interface Props {
  params: { locale: string; slug: string };
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

interface Post {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  featuredImageKey: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  readingTimeMinutes: number;
  publishedAt: string | null;
  authorName: string | null;
  categories: { id: string; name: string; slug: string; color: string | null }[];
  tags: { id: string; name: string; slug: string }[];
}

async function fetchPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API}/public/blog/posts/slug/${slug}`, {
      next: { revalidate: 60, tags: ["blog", `blog-${slug}`] },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchRelated(postId: string): Promise<Post[]> {
  try {
    const res = await fetch(`${API}/public/blog/posts/${postId}/related`, {
      next: { revalidate: 300, tags: ["blog"] },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchProductRefs(postId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API}/public/blog/posts/${postId}/products`, {
      next: { revalidate: 120, tags: ["blog", "products"] },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPost(params.slug);
  if (!post) return { title: "Article not found" };

  const title       = post.seoTitle       ?? post.title;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  const imageUrl    = post.featuredImageUrl ?? undefined;
  const canonical   = post.canonicalUrl ?? undefined;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      authors:       post.authorName ? [post.authorName] : undefined,
      images:        imageUrl ? [{ url: imageUrl, alt: post.featuredImageAlt ?? title }] : undefined,
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      imageUrl ? [imageUrl] : undefined,
    },
    other: {
      "article:section": post.categories[0]?.name ?? "",
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const post    = await fetchPost(params.slug);
  if (!post) notFound();

  const [related, productRefs] = await Promise.all([
    fetchRelated(post.id),
    fetchProductRefs(post.id),
  ]);

  // ── Schema.org Article structured data ────────────────────────────────────
  const imageUrl = post.featuredImageUrl ?? undefined;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: imageUrl,
    datePublished: post.publishedAt ?? undefined,
    author: post.authorName ? { "@type": "Person", name: post.authorName } : undefined,
    publisher: {
      "@type": "Organization",
      name: "vitecamion",
    },
    articleSection: post.categories[0]?.name ?? undefined,
    keywords: post.tags.map(t => t.name).join(", ") || undefined,
    timeRequired: `PT${post.readingTimeMinutes}M`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ArticlePage post={post} locale={params.locale} related={related} />

      {productRefs.length > 0 && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 64px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Featured Products</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {productRefs.map((ref: any) => (
              <a
                key={ref.referenceId}
                href={`/${params.locale}/shop/${ref.product.slug}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                  {ref.product.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ref.product.imageUrl}
                      alt={ref.product.title}
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }}
                    />
                  )}
                  <div style={{ padding: 12 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{ref.product.title}</p>
                    {ref.label && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{ref.label}</p>
                    )}
                    {ref.product.priceCents != null && (
                      <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                        €{(ref.product.priceCents / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

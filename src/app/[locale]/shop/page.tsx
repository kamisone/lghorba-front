export const revalidate = 60;

import ShopListing from "./ShopListing";

interface Props {
  params: { locale: string };
  searchParams?: { category?: string; tag?: string; search?: string; page?: string };
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

export default async function ShopPage({ params, searchParams }: Props) {
  const { locale } = params;
  const category = searchParams?.category;
  const tag = searchParams?.tag;
  const search = searchParams?.search;
  const page = parseInt(searchParams?.page ?? "1", 10);
  const limit = 24;
  const offset = (page - 1) * limit;

  const qs = new URLSearchParams();
  if (category) qs.set("categoryId", category);
  if (tag) qs.set("tagId", tag);
  if (search) qs.set("search", search);
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (locale !== 'fr') qs.set("lang", locale);

  const langParam = locale !== 'fr' ? `?lang=${locale}` : '';

  const [productsRes, categoriesRes, collectionsRes, promotionsRes] = await Promise.all([
    fetch(`${API}/public/shop/products?${qs}`, { next: { revalidate: 60, tags: ["products"] } }),
    fetch(`${API}/public/shop/products/categories`, { next: { revalidate: 300, tags: ["products"] } }),
    fetch(`${API}/public/shop/collections/featured${langParam}`, { next: { revalidate: 300, tags: ["collections"] } }),
    fetch(`${API}/public/shop/promotions/active`, { next: { revalidate: 60, tags: ["promotions"] } }),
  ]);

  const productsData  = productsRes.ok  ? await productsRes.json()  : { items: [], total: 0 };
  const categories    = categoriesRes.ok ? await categoriesRes.json() : [];
  const collections   = collectionsRes.ok ? await collectionsRes.json() : [];
  const promotions    = promotionsRes.ok ? await promotionsRes.json() : [];

  return (
    <ShopListing
      locale={locale}
      products={productsData.items ?? []}
      total={productsData.total ?? 0}
      categories={Array.isArray(categories) ? categories : []}
      featuredCollections={Array.isArray(collections) ? collections : []}
      activePromotions={Array.isArray(promotions) ? promotions : []}
      page={page}
      limit={limit}
      activeCategory={category}
      activeTag={tag}
      activeSearch={search}
    />
  );
}

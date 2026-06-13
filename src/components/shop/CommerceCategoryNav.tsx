"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import styles from "./CommerceCategoryNav.module.css";

interface Category { id: string; name: string }

interface Props {
  locale: string;
  className?: string;
}

export default function CommerceCategoryNav({ locale, className }: Props) {
  const t = getTranslations(locale).shop;
  const [categories, setCategories] = useState<Category[]>([]);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch("/next-api/public/shop/products/categories")
      .then(r => r.ok ? r.json() : [])
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const onShopPage = pathname === `/${locale}/shop`;
  const activeCategory = onShopPage ? searchParams.get("category") : null;

  return (
    <>
      <Link
        href={`/${locale}/shop`}
        className={`${styles.item} ${className ?? ""} ${onShopPage && !activeCategory ? styles.active : ""}`}
      >
        {t.allProducts}
      </Link>
      {categories.map(c => (
        <Link
          key={c.id}
          href={`/${locale}/shop?category=${c.id}`}
          className={`${styles.item} ${className ?? ""} ${activeCategory === c.id ? styles.active : ""}`}
        >
          {c.name}
        </Link>
      ))}
    </>
  );
}

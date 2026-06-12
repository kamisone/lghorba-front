"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import styles from "./CommerceCategoriesMenu.module.css";

interface Category { id: string; name: string }

interface Props {
  locale: string;
  className?: string;
}

export default function CommerceCategoriesMenu({ locale, className }: Props) {
  const t = getTranslations(locale).shop;
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/next-api/public/shop/products/categories")
      .then(r => r.ok ? r.json() : [])
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${className ?? ""}`}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.openCategories}
      >
        {t.categoriesLabel}
        <ChevronDown size={14} strokeWidth={2.25} className={open ? styles.chevOpen : styles.chev} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.panel} role="menu">
          <Link href={`/${locale}/shop`} className={styles.item} role="menuitem" onClick={() => setOpen(false)}>
            {t.allProducts}
          </Link>
          {categories.map(c => (
            <Link
              key={c.id}
              href={`/${locale}/shop?category=${c.id}`}
              className={styles.item}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

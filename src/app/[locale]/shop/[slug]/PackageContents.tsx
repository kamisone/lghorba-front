"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import ImageLightbox from "@/components/shop/ImageLightbox";
import { getTranslations } from "@/lib/i18n";
import styles from "./ProductDetail.module.css";

interface ResolvedPackageContentItem {
  id: string;
  key: string;
  label?: string | null;
  url: string;
}

interface Props {
  locale: string;
  items: ResolvedPackageContentItem[];
}

export default function PackageContents({ locale, items }: Props) {
  const t = getTranslations(locale).shop;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items.length) return null;

  return (
    <>
      <details className={styles.packageSection}>
        <summary className={styles.packageToggle}>
          <span className={styles.packageToggleLabel}>
            <Package size={16} className={styles.packageToggleIcon} aria-hidden="true" />
            {t.packageContentsTitle}
          </span>
          <span className={styles.packageChevron} aria-hidden="true" />
        </summary>

        <div className={styles.packageBody}>
          <div className={styles.packageGrid}>
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={styles.packageItem}
                onClick={() => setOpenIndex(i)}
                aria-label={item.label?.trim() || t.packageContentsTitle}
              >
                <span className={styles.packageThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" loading="lazy" decoding="async" draggable={false} className={styles.packageThumbImg} />
                </span>
                {item.label?.trim() && <span className={styles.packageLabel}>{item.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </details>

      {openIndex !== null && (
        <ImageLightbox
          images={items.map(item => ({ id: item.id, url: item.url, title: item.label ?? undefined }))}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          ariaLabel={t.packageContentsTitle}
        />
      )}
    </>
  );
}

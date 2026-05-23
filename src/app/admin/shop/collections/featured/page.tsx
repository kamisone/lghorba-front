"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Collection {
  id: string;
  slug: string;
  title: string;
  isFeatured: boolean;
  isActive: boolean;
  productCount?: number;
}

export default function FeaturedCollectionsPage() {
  const [items, setItems]     = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/next-api/shop/collections")
      .then(r => r.json())
      .then((d: Collection[]) => setItems((Array.isArray(d) ? d : []).filter(c => c.isFeatured)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Featured Collections</h1>
        <span className={styles.subtitle}>{items.length} featured</span>
        <Link href="/admin/shop/collections" className={`${styles.btn} ${styles.btnPrimary}`}>
          Manage All Collections
        </Link>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 4 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                No featured collections. Mark collections as featured from the{" "}
                <Link href="/admin/shop/collections" className={styles.link}>Collections</Link> page.
              </td>
            </tr>
          ) : items.map(c => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{c.slug}</td>
              <td><span className={`${styles.badge} ${c.isActive ? styles.badgeActive : styles.badgeDraft}`}>{c.isActive ? "Active" : "Inactive"}</span></td>
              <td><Link href={`/admin/shop/collections`} className={styles.link}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

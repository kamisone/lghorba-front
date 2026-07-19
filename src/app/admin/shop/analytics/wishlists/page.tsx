"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface MostWishlisted { productId: string; title: string; slug: string; wishlistCount: number }
interface NonConverting { productId: string; title: string; slug: string; shopCustomerId: string; wishlistedAt: string }

export default function WishlistInsightsPage() {
  const [mostWishlisted, setMostWishlisted] = useState<MostWishlisted[]>([]);
  const [nonConverting, setNonConverting]   = useState<NonConverting[]>([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/next-api/admin/shop/wishlists/most-wishlisted?limit=20").then(r => r.ok ? r.json() : []),
      fetch("/next-api/admin/shop/wishlists/non-converting?limit=20").then(r => r.ok ? r.json() : []),
    ]).then(([most, nonConv]) => {
      setMostWishlisted(Array.isArray(most) ? most : []);
      setNonConverting(Array.isArray(nonConv) ? nonConv : []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Wishlist Insights</h1>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Most Wishlisted Products</h2>
      {loading ? (
        <span className={styles.skeleton} style={{ height: 200, width: "100%", borderRadius: 12, display: "block", marginBottom: 32 }} />
      ) : mostWishlisted.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>No products wishlisted yet.</p>
      ) : (
        <table className={styles.table} style={{ marginBottom: 32 }}>
          <thead><tr><th>Product</th><th>Times Wishlisted</th></tr></thead>
          <tbody>
            {mostWishlisted.map(p => (
              <tr key={p.productId}>
                <td>{p.slug ? <Link href={`/shop/${p.slug}`} className={styles.link} target="_blank">{p.title}</Link> : p.title}</td>
                <td>{p.wishlistCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        Non-Converting Wishlists
        <span style={{ fontWeight: 400, fontSize: 13, color: "#9ca3af", marginLeft: 8 }}>— wishlisted but never purchased, retargeting candidates</span>
      </h2>
      {loading ? (
        <span className={styles.skeleton} style={{ height: 200, width: "100%", borderRadius: 12, display: "block" }} />
      ) : nonConverting.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>No non-converting wishlist items found.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>Product</th><th>Customer</th><th>Wishlisted</th></tr></thead>
          <tbody>
            {nonConverting.map(w => (
              <tr key={`${w.productId}-${w.shopCustomerId}`}>
                <td>{w.slug ? <Link href={`/shop/${w.slug}`} className={styles.link} target="_blank">{w.title}</Link> : w.title}</td>
                <td>
                  <Link href={`/admin/shop/customers/${w.shopCustomerId}`} className={styles.link}>
                    View customer
                  </Link>
                </td>
                <td>{new Date(w.wishlistedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

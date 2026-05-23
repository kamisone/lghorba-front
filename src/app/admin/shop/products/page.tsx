"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface Product {
  id: string;
  title: string;
  sku: string | null;
  status: string;
  featured: boolean;
  featuredImageUrl: string | null;
  createdAt: string;
  deletedAt?: string | null;
  variants: Array<{ priceCents: number; isDefault: boolean }>;
}

type Tab = "active" | "trash";

function statusBadge(status: string) {
  const cls: Record<string, string> = { active: styles.badgeActive, draft: styles.badgeDraft, archived: styles.badgeCancelled };
  return <span className={`${styles.badge} ${cls[status] ?? styles.badgeDraft}`}>{status}</span>;
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [tab, setTab]         = useState<Tab>("active");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal]     = useState(0);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (search) qs.set("search", search);
      const url = tab === "trash"
        ? `/next-api/shop/products/deleted?${qs}`
        : `/next-api/shop/products?${qs}${status ? `&status=${status}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab, page, status]);

  function switchTab(next: Tab) {
    setTab(next);
    setPage(1);
    setSearch("");
    setStatus("");
  }

  async function handleDelete(id: string) {
    if (!confirm("Move this product to Trash?")) return;
    const res = await fetch(`/next-api/shop/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product moved to Trash");
      setProducts(prev => prev.filter(p => p.id !== id));
      setTotal(t => t - 1);
    } else {
      toast.error("Failed to delete product");
    }
  }

  async function handlePublish(id: string) {
    const res = await fetch(`/next-api/shop/products/${id}/publish`, { method: "POST" });
    if (res.ok) toast.success("Product published");
    else toast.error("Failed to publish product");
    load();
  }

  async function handleRestore(id: string) {
    const res = await fetch(`/next-api/shop/products/${id}/restore`, { method: "POST" });
    if (res.ok) {
      toast.success("Product restored");
      setProducts(prev => prev.filter(p => p.id !== id));
      setTotal(t => t - 1);
    } else {
      toast.error("Failed to restore product");
    }
  }

  async function handleHardDelete(id: string) {
    if (!confirm("Permanently delete this product? This cannot be undone.")) return;
    const res = await fetch(`/next-api/shop/products/${id}/permanent`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product permanently deleted");
      setProducts(prev => prev.filter(p => p.id !== id));
      setTotal(t => t - 1);
    } else {
      toast.error("Failed to permanently delete product");
    }
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Products</h1>
        {tab === "active" && (
          <Link href="/admin/shop/products/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            + New Product
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
        {(["active", "trash"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? "#111827" : "#6b7280",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid #111827" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color .15s",
              textTransform: "capitalize",
            }}
          >
            {t === "trash" ? "🗑 Trash" : "Products"}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <div className={styles.filters}>
          <input
            className={styles.filterInput}
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); load(); } }}
          />
          <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}

      {tab === "trash" && (
        <div className={styles.filters}>
          <input
            className={styles.filterInput}
            placeholder="Search deleted products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); load(); } }}
          />
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Image</th>
            <th>Title</th>
            <th>SKU</th>
            {tab === "active" && <><th>Price</th><th>Status</th></>}
            {tab === "trash" && <th>Deleted</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 6 }, (_, i) => (
            <tr key={i}>
              <td><span className={styles.skeleton} style={{ height: 48, width: 48, borderRadius: 6 }} /></td>
              {[160, 70, 70, 60, 100].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : products.map(p => {
            const defVariant = p.variants?.find(v => v.isDefault) ?? p.variants?.[0];
            return (
              <tr key={p.id}>
                <td>
                  {p.featuredImageUrl ? (
                    <Image src={p.featuredImageUrl} alt={p.title} width={48} height={48} style={{ borderRadius: 6, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: "#f3f4f6", borderRadius: 6 }} />
                  )}
                </td>
                <td>
                  {tab === "active"
                    ? <Link href={`/admin/shop/products/${p.id}`}>{p.title}</Link>
                    : <span style={{ color: "#6b7280" }}>{p.title}</span>
                  }
                </td>
                <td style={{ color: "#9ca3af" }}>{p.sku ?? "—"}</td>
                {tab === "active" && (
                  <>
                    <td>{defVariant ? `€${(defVariant.priceCents / 100).toFixed(2)}` : "—"}</td>
                    <td>{statusBadge(p.status)}</td>
                  </>
                )}
                {tab === "trash" && (
                  <td style={{ fontSize: 12, color: "#9ca3af" }}>
                    {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : "—"}
                  </td>
                )}
                <td style={{ display: "flex", gap: 8 }}>
                  {tab === "active" && (
                    <>
                      <Link href={`/admin/shop/products/${p.id}`} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 12, padding: "4px 10px" }}>Edit</Link>
                      {p.status === "draft" && (
                        <button onClick={() => handlePublish(p.id)} className={`${styles.btn} ${styles.btnSuccess}`} style={{ fontSize: 12, padding: "4px 10px" }}>Publish</button>
                      )}
                      <button onClick={() => handleDelete(p.id)} className={`${styles.btn} ${styles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }}>Delete</button>
                    </>
                  )}
                  {tab === "trash" && (
                    <>
                      <button onClick={() => handleRestore(p.id)} className={`${styles.btn} ${styles.btnSuccess}`} style={{ fontSize: 12, padding: "4px 10px" }}>Restore</button>
                      <button onClick={() => handleHardDelete(p.id)} className={`${styles.btn} ${styles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }}>Delete Permanently</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {!loading && products.length === 0 && (
            <tr>
              <td colSpan={tab === "active" ? 6 : 5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                {tab === "trash" ? "Trash is empty" : "No products found"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{total} {tab === "trash" ? "deleted" : ""} products</span>
        {Array.from({ length: pages }, (_, i) => (
          <button key={i} onClick={() => setPage(i + 1)} className={`${styles.btn} ${page === i + 1 ? styles.btnPrimary : styles.btnSecondary}`} style={{ padding: "4px 10px", minWidth: 36 }}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

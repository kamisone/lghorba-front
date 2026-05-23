"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpentCents: number;
  marketingOptIn: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (search) qs.set("search", search);
      const res = await fetch(`/next-api/admin/shop/customers?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      } else {
        toast.error("Failed to load customers");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  const pages = Math.ceil(total / limit);

  function fullName(c: Customer) {
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : "—";
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customers</h1>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.filterInput}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { setPage(1); load(); } }}
        />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Orders</th>
            <th>Total spent</th>
            <th>Joined</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {[110, 160, 90, 40, 70, 70, 50].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{fullName(c)}</strong></td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>{c.email}</td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>{c.phone ?? "—"}</td>
                  <td>{c.totalOrders}</td>
                  <td>€{(c.totalSpentCents / 100).toFixed(2)}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link
                      href={`/admin/shop/customers/${c.id}`}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
          }
          {!loading && customers.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                No customers found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{total} customers</span>
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`${styles.btn} ${page === i + 1 ? styles.btnPrimary : styles.btnSecondary}`}
            style={{ padding: "4px 10px", minWidth: 36 }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

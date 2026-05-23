"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  city: string;
  countryCode: string;
  isDefault: boolean;
}

interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  addresses: Address[];
}

export default function CustomerAddressesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (search) params.set("search", search);
    fetch(`/next-api/admin/shop/customers?${params}`)
      .then(r => r.json())
      .then(d => setCustomers(d.items ?? d ?? []))
      .finally(() => setLoading(false));
  }, [search]);

  const rows = customers.flatMap(c =>
    (c.addresses ?? []).map(a => ({ customer: c, address: a }))
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customer Addresses</h1>
        <span className={styles.subtitle}>{rows.length} addresses</span>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.filterInput}
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Name</th>
            <th>Address</th>
            <th>City</th>
            <th>Country</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 6 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No addresses found</td></tr>
          ) : rows.map(({ customer, address }) => (
            <tr key={address.id}>
              <td style={{ color: "#6b7280", fontSize: 13 }}>{customer.email}</td>
              <td>{address.firstName} {address.lastName}</td>
              <td>{address.addressLine1}</td>
              <td>{address.city}</td>
              <td>{address.countryCode}</td>
              <td>{address.isDefault ? <span className={`${styles.badge} ${styles.badgeActive}`}>Default</span> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

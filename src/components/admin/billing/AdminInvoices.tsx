"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type InvoiceStatus = "draft" | "issued" | "paid" | "void";

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  customerName: string | null;
  customerEmail: string | null;
  totalAmount: number;
  currency: string;
  taxRateLabel: string;
  issuedAt: string | null;
  pdfGeneratedAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
  booking?: { id: string; startDateTime: string; endDateTime: string };
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  void: "Void",
};

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: "#94a3b8",
  issued: "#3b82f6",
  paid: "#22c55e",
  void: "#ef4444",
};

function fmtEur(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvoiceStatus | "">("");

  const load = async (status?: InvoiceStatus | "") => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/next-api/invoices${qs}`);
      if (res.ok) setInvoices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter || undefined);
  }, [filter]);

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700 }}>Invoices</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as InvoiceStatus | "")}
          style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px" }}
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : invoices.length === 0 ? (
        <p style={{ color: "#64748b" }}>No invoices.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Invoice #", "Status", "Customer", "Amount", "Issued", "PDF", "Email", "Booking"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      style={{ color: "#0f172a", fontWeight: 600, textDecoration: "none" }}
                    >
                      {inv.invoiceNumber ?? "—"}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        background: `${STATUS_COLOR[inv.status]}20`,
                        color: STATUS_COLOR[inv.status],
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 500 }}>{inv.customerName ?? "—"}</div>
                    <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.customerEmail ?? ""}</div>
                  </td>
                  <td style={{ padding: "10px 12px", fontVariantNumeric: "tabular-nums" }}>
                    {fmtEur(Number(inv.totalAmount))}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{fmtDate(inv.issuedAt)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {inv.pdfGeneratedAt ? (
                      <span style={{ color: "#22c55e" }}><Check size={14} strokeWidth={2} /></span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {inv.emailSentAt ? (
                      <span style={{ color: "#22c55e" }}><Check size={14} strokeWidth={2} /></span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {inv.booking ? (
                      <Link href={`/admin/bookings?modal=booking&id=${inv.booking.id}`} style={{ color: "#3b82f6", fontSize: "11px" }}>
                        view
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

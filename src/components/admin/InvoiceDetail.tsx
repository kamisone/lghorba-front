"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InvoiceStatus = "draft" | "issued" | "paid" | "void";

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  startDate: string | null;
  endDate: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  customerName: string | null;
  customerEmail: string | null;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  taxRateLabel: string;
  taxRateSnapshot: number;
  taxCountry: string;
  sellerName: string;
  sellerAddress: Record<string, string>;
  sellerVatNumber: string | null;
  sellerSiret: string | null;
  paymentIntentId: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  pdfStoragePath: string | null;
  pdfGeneratedAt: string | null;
  emailSentAt: string | null;
  lines: InvoiceLine[];
  booking?: { id: string; startDateTime: string; endDateTime: string };
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft", issued: "Issued", paid: "Paid", void: "Void",
};
const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: "#94a3b8", issued: "#3b82f6", paid: "#22c55e", void: "#ef4444",
};

function fmtEur(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

export default function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice]   = useState<Invoice | null>(null);
  const [loading, setLoading]   = useState(true);
  const [voiding, setVoiding]   = useState(false);
  const [downloading, setDl]    = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/next-api/invoices/${invoiceId}`);
      if (!res.ok) { setError("Invoice not found"); return; }
      setInvoice(await res.json());
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [invoiceId]);

  const handleDownload = async () => {
    setDl(true);
    try {
      const res = await fetch(`/next-api/invoices/${invoiceId}/download`);
      if (!res.ok) { alert("PDF not available"); return; }
      const { url } = await res.json();
      window.open(url, "_blank");
    } finally {
      setDl(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    setVoiding(true);
    try {
      const res = await fetch(`/next-api/invoices/${invoiceId}/void`, { method: "POST" });
      if (!res.ok) { alert("Failed to void invoice"); return; }
      await load();
    } finally {
      setVoiding(false);
    }
  };

  if (loading) return <div style={{ padding: "24px" }}>Loading…</div>;
  if (error || !invoice) return <div style={{ padding: "24px", color: "#ef4444" }}>{error ?? "Not found"}</div>;

  const addr = invoice.sellerAddress;

  return (
    <div style={{ padding: "24px", maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <button onClick={() => router.push("/admin/invoices")} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: "13px", padding: 0, marginBottom: "8px" }}>
            ← Back to invoices
          </button>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>
            {invoice.invoiceNumber ?? "Draft"}
          </h1>
          <span style={{
            display: "inline-block", marginTop: "6px",
            background: `${STATUS_COLOR[invoice.status]}20`,
            color: STATUS_COLOR[invoice.status],
            padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
          }}>
            {STATUS_LABEL[invoice.status]}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {invoice.pdfGeneratedAt && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{ padding: "8px 16px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
            >
              {downloading ? "…" : "Download PDF"}
            </button>
          )}
          {(invoice.status === "issued" || invoice.status === "paid") && (
            <button
              onClick={handleVoid}
              disabled={voiding}
              style={{ padding: "8px 16px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
            >
              {voiding ? "…" : "Void"}
            </button>
          )}
        </div>
      </div>

      {/* Meta grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <InfoCard title="Seller">
          <b>{invoice.sellerName}</b><br />
          {addr.line1}<br />
          {addr.zip} {addr.city}<br />
          {invoice.sellerSiret     && <span>SIRET: {invoice.sellerSiret}<br /></span>}
          {invoice.sellerVatNumber && <span>VAT: {invoice.sellerVatNumber}</span>}
        </InfoCard>
        <InfoCard title="Customer">
          {invoice.customerName ?? "—"}<br />
          {invoice.customerEmail ?? "—"}
        </InfoCard>
        <InfoCard title="Dates">
          <Row label="Issued"  value={fmtDate(invoice.issuedAt)} />
          <Row label="Paid"    value={fmtDate(invoice.paidAt)} />
          {invoice.voidedAt && <Row label="Voided" value={fmtDate(invoice.voidedAt)} />}
        </InfoCard>
        <InfoCard title="References">
          {invoice.paymentIntentId && <Row label="Stripe PI" value={invoice.paymentIntentId} mono />}
          <Row label="PDF generated" value={fmtDate(invoice.pdfGeneratedAt)} />
          <Row label="Email sent"    value={fmtDate(invoice.emailSentAt)} />
        </InfoCard>
      </div>

      {/* Lines */}
      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "#0f172a" }}>Line items</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              {["Description", "Qty (days)", "Unit price", "Total"].map(h => (
                <th key={h} style={{ padding: "6px 0", textAlign: h === "Description" ? "left" : "right", fontWeight: 600, color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 0", color: "#334155" }}>{l.description}</td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>{l.quantity}</td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>{fmtEur(Number(l.unitPrice))}</td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>{fmtEur(Number(l.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "260px" }}>
          <SummaryRow label="Subtotal (excl. tax)" value={fmtEur(Number(invoice.subtotalAmount))} />
          <SummaryRow label={invoice.taxRateLabel}  value={fmtEur(Number(invoice.taxAmount))} />
          <SummaryRow label="Total (incl. tax)"     value={fmtEur(Number(invoice.totalAmount))} total />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "14px" }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.6px", color: "#94a3b8", fontWeight: 600, marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.7" }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontFamily: mono ? "monospace" : undefined, fontSize: mono ? "11px" : undefined }}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "6px 0",
      borderTop: total ? "2px solid #0f172a" : undefined,
      fontWeight: total ? 700 : undefined,
      fontSize: total ? "15px" : "13px",
      color: "#0f172a",
    }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

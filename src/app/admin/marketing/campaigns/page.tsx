"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import styles from "@/components/admin/marketing/MarketingAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

interface AudienceDefinition {
  segment: string;
  tags?: string[];
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  type: string;
  status: CampaignStatus;
  audience: AudienceDefinition;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<CampaignStatus, string> = {
  draft: styles.statusDraft,
  scheduled: styles.statusScheduled,
  sending: styles.statusSending,
  sent: styles.statusSent,
  cancelled: styles.statusCancelled,
};

const TYPE_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  promotion: "Promotion",
  new_arrivals: "New Arrivals",
  flash_sale: "Flash Sale",
  category: "Category",
  abandoned_cart: "Abandoned Cart",
  product_launch: "Product Launch",
  announcement: "Announcement",
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "All subscribers",
  fr: "French speakers",
  en: "English speakers",
  customers: "Customers",
  non_customers: "Non-customers",
  purchasers: "Purchasers",
  newsletter_only: "Newsletter-only",
  tags: "Custom tags",
};

export default function CampaignsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter) qs.set("type", typeFilter);
      if (search) qs.set("search", search);
      const res = await fetch(`/next-api/admin/newsletter/campaigns?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      } else {
        toast.error("Failed to load campaigns");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  const pages = Math.ceil(total / limit) || 1;

  function applyFilters() {
    setPage(1);
    load();
  }

  async function createCampaign() {
    router.push("/admin/marketing/campaigns/new");
  }

  async function duplicateCampaign(id: string) {
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      toast.success("Campaign duplicated");
      router.push(`/admin/marketing/campaigns/${data.id}`);
    } else {
      toast.error("Duplicate failed");
    }
  }

  async function cancelCampaign(id: string) {
    if (!confirm("Cancel this scheduled campaign?")) return;
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${id}/cancel`, { method: "POST" });
    if (res.ok) { toast.success("Campaign cancelled"); load(); }
    else toast.error("Cancel failed");
  }

  function audienceLabel(audience: AudienceDefinition) {
    const label = AUDIENCE_LABELS[audience.segment] ?? audience.segment;
    return audience.segment === "tags" && audience.tags?.length ? `${label}: ${audience.tags.join(", ")}` : label;
  }

  return (
    <div className={shopStyles.container}>
      <div className={shopStyles.header}>
        <h1 className={shopStyles.title}>Campaigns</h1>
        <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} onClick={createCampaign}>
          New Campaign
        </button>
      </div>

      <div className={shopStyles.filters}>
        <input
          className={shopStyles.filterInput}
          placeholder="Search title or subject…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
        />
        <select className={shopStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); applyFilters(); }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={shopStyles.filterSelect} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); applyFilters(); }}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} onClick={applyFilters}>Filter</button>
      </div>

      <table className={shopStyles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Status</th>
            <th>Audience</th>
            <th>Scheduled / Sent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <td key={j}><span className={shopStyles.skeleton} style={{ height: 14, width: 90 }} /></td>
                  ))}
                </tr>
              ))
            : campaigns.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{c.subject}</td>
                  <td style={{ fontSize: 13 }}>{TYPE_LABELS[c.type] ?? c.type}</td>
                  <td><span className={`${styles.statusBadge} ${STATUS_CLASS[c.status]}`}>{STATUS_LABELS[c.status]}</span></td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{audienceLabel(c.audience)}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>
                    {c.sentAt ? new Date(c.sentAt).toLocaleString()
                      : c.scheduledAt ? new Date(c.scheduledAt).toLocaleString()
                      : "—"}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/admin/marketing/campaigns/${c.id}`} className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} style={{ fontSize: 12, padding: "4px 10px" }}>
                      {c.status === "draft" || c.status === "scheduled" ? "Edit" : "View"}
                    </Link>
                    <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => duplicateCampaign(c.id)}>
                      Duplicate
                    </button>
                    {c.status === "scheduled" && (
                      <button className={`${shopStyles.btn} ${shopStyles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => cancelCampaign(c.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
          }
          {!loading && campaigns.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                No campaigns found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={shopStyles.pagination}>
        <span className={shopStyles.pageInfo}>{total} campaigns</span>
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`${shopStyles.btn} ${page === i + 1 ? shopStyles.btnPrimary : shopStyles.btnSecondary}`}
            style={{ padding: "4px 10px", minWidth: 36 }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

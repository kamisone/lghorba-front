"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import styles from "@/components/admin/marketing/MarketingAdmin.module.css";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

interface Overview {
  totalSubscribers: number;
  subscribedCount: number;
  sentEmails: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
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

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function MarketingDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/next-api/admin/newsletter/analytics/overview").then(r => r.ok ? r.json() : null),
      fetch("/next-api/admin/newsletter/campaigns?limit=5").then(r => r.ok ? r.json() : { items: [] }),
    ])
      .then(([ov, camp]) => {
        setOverview(ov);
        setCampaigns(Array.isArray(camp.items) ? camp.items : []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={shopStyles.container}>
      <div className={shopStyles.header}>
        <h1 className={shopStyles.title}>Newsletter & Email Marketing</h1>
        <Link href="/admin/marketing/campaigns/new" className={`${shopStyles.btn} ${shopStyles.btnPrimary}`}>
          New Campaign
        </Link>
      </div>

      <div className={shopStyles.kpiGrid}>
        <div className={shopStyles.kpiCard}>
          <div className={shopStyles.kpiLabel}>Subscribers</div>
          {loading ? <span className={`${shopStyles.skeleton} ${shopStyles.skeletonKpi}`} /> : <div className={shopStyles.kpiValue}>{overview?.subscribedCount.toLocaleString() ?? 0}</div>}
        </div>
        <div className={shopStyles.kpiCard}>
          <div className={shopStyles.kpiLabel}>Emails sent</div>
          {loading ? <span className={`${shopStyles.skeleton} ${shopStyles.skeletonKpi}`} /> : <div className={shopStyles.kpiValue}>{overview?.sentEmails.toLocaleString() ?? 0}</div>}
        </div>
        <div className={shopStyles.kpiCard}>
          <div className={shopStyles.kpiLabel}>Open rate</div>
          {loading ? <span className={`${shopStyles.skeleton} ${shopStyles.skeletonKpi}`} /> : <div className={shopStyles.kpiValue}>{pct(overview?.openRate ?? 0)}</div>}
        </div>
        <div className={shopStyles.kpiCard}>
          <div className={shopStyles.kpiLabel}>Click rate</div>
          {loading ? <span className={`${shopStyles.skeleton} ${shopStyles.skeletonKpi}`} /> : <div className={shopStyles.kpiValue}>{pct(overview?.clickRate ?? 0)}</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Link href="/admin/marketing/campaigns" className={`${shopStyles.btn} ${shopStyles.btnSecondary}`}>Campaigns</Link>
        <Link href="/admin/marketing/subscribers" className={`${shopStyles.btn} ${shopStyles.btnSecondary}`}>Subscribers</Link>
        <Link href="/admin/marketing/analytics" className={`${shopStyles.btn} ${shopStyles.btnSecondary}`}>Email Analytics</Link>
      </div>

      <div className={shopStyles.header}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Recent campaigns</h2>
      </div>

      <table className={shopStyles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Scheduled / Sent</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <td key={j}><span className={shopStyles.skeleton} style={{ height: 14, width: 90 }} /></td>
                  ))}
                </tr>
              ))
            : campaigns.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{c.subject}</td>
                  <td><span className={`${styles.statusBadge} ${STATUS_CLASS[c.status]}`}>{STATUS_LABELS[c.status]}</span></td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>
                    {c.sentAt ? new Date(c.sentAt).toLocaleString()
                      : c.scheduledAt ? new Date(c.scheduledAt).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <Link href={`/admin/marketing/campaigns/${c.id}`} className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} style={{ fontSize: 12, padding: "4px 10px" }}>
                      {c.status === "draft" || c.status === "scheduled" ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))
          }
          {!loading && campaigns.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                No campaigns yet — create your first one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

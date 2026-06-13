"use client";

import { useEffect, useState } from "react";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import styles from "@/components/admin/marketing/MarketingAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import SubscriberGrowthChart, { type GrowthPoint } from "@/components/admin/marketing/charts/SubscriberGrowthChart";
import CampaignPerformanceChart, { type CampaignPerfRow } from "@/components/admin/marketing/charts/CampaignPerformanceChart";

interface Overview {
  totalSubscribers: number;
  subscribedCount: number;
  unsubscribedCount: number;
  bouncedCount: number;
  sentEmails: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
}

interface CampaignPerformanceRow extends CampaignPerfRow {
  subject: string;
  sentAt: string | null;
  recipients: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
}

const DAY_OPTIONS = [7, 30, 90];

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function MarketingAnalyticsPage() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPerformanceRow[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/next-api/admin/newsletter/analytics/overview").then(r => r.ok ? r.json() : null),
      fetch(`/next-api/admin/newsletter/analytics/growth?days=${days}`).then(r => r.ok ? r.json() : []),
      fetch("/next-api/admin/newsletter/analytics/campaigns?limit=10").then(r => r.ok ? r.json() : []),
    ])
      .then(([ov, gr, camp]) => {
        if (!ov) toast.error("Failed to load analytics overview");
        setOverview(ov);
        setGrowth(Array.isArray(gr) ? gr : []);
        setCampaigns(Array.isArray(camp) ? camp : []);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className={shopStyles.container}>
      <div className={shopStyles.header}>
        <h1 className={shopStyles.title}>Email Analytics</h1>
      </div>

      <div className={shopStyles.kpiGrid}>
        <div className={shopStyles.kpiCard}>
          <div className={shopStyles.kpiLabel}>Total subscribers</div>
          {loading ? <span className={`${shopStyles.skeleton} ${shopStyles.skeletonKpi}`} /> : <div className={shopStyles.kpiValue}>{overview?.totalSubscribers.toLocaleString() ?? 0}</div>}
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
        <div className={shopStyles.kpiCard}>
          <div className={shopStyles.kpiLabel}>Unsubscribe rate</div>
          {loading ? <span className={`${shopStyles.skeleton} ${shopStyles.skeletonKpi}`} /> : <div className={shopStyles.kpiValue}>{pct(overview?.unsubscribeRate ?? 0)}</div>}
        </div>
        <div className={shopStyles.kpiCard}>
          <div className={shopStyles.kpiLabel}>Bounce rate</div>
          {loading ? <span className={`${shopStyles.skeleton} ${shopStyles.skeletonKpi}`} /> : <div className={shopStyles.kpiValue}>{pct(overview?.bounceRate ?? 0)}</div>}
        </div>
      </div>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className={styles.chartTitle}>Subscriber growth</h3>
            <div style={{ display: "flex", gap: 6 }}>
              {DAY_OPTIONS.map(d => (
                <button
                  key={d}
                  className={`${shopStyles.btn} ${days === d ? shopStyles.btnPrimary : shopStyles.btnSecondary}`}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                  onClick={() => setDays(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <SubscriberGrowthChart data={growth} />
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Campaign performance</h3>
          <CampaignPerformanceChart data={campaigns} />
        </div>
      </div>

      <table className={shopStyles.table}>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Sent</th>
            <th>Recipients</th>
            <th>Opens</th>
            <th>Clicks</th>
            <th>Open rate</th>
            <th>Click rate</th>
            <th>Unsubscribes</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id}>
              <td><strong>{c.title}</strong></td>
              <td style={{ fontSize: 13, color: "#6b7280" }}>{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}</td>
              <td>{c.recipients}</td>
              <td>{c.opens}</td>
              <td>{c.clicks}</td>
              <td>{pct(c.openRate)}</td>
              <td>{pct(c.clickRate)}</td>
              <td>{c.unsubscribes}</td>
            </tr>
          ))}
          {!loading && campaigns.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                No sent campaigns yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

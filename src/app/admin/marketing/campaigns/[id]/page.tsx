"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import styles from "@/components/admin/marketing/MarketingAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import EmailEditor from "@/components/admin/marketing/EmailEditor";
import AudienceSelector, { type AudienceDefinition } from "@/components/admin/marketing/AudienceSelector";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  previewText: string | null;
  htmlContent: string;
  audience: AudienceDefinition;
  status: CampaignStatus;
  type: string;
  tags: string[];
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

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "newsletter",     label: "Newsletter" },
  { value: "promotion",      label: "Promotion" },
  { value: "new_arrivals",   label: "New Arrivals" },
  { value: "flash_sale",     label: "Flash Sale" },
  { value: "category",       label: "Category" },
  { value: "abandoned_cart", label: "Abandoned Cart" },
  { value: "product_launch", label: "Product Launch" },
  { value: "announcement",   label: "Announcement" },
];

export default function CampaignEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [type, setType] = useState("newsletter");
  const [tagsInput, setTagsInput] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [audience, setAudience] = useState<AudienceDefinition>({ segment: "all" });

  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/next-api/admin/newsletter/campaigns/${id}`);
      if (res.ok) {
        const data: Campaign = await res.json();
        setCampaign(data);
        setTitle(data.title);
        setSubject(data.subject);
        setPreviewText(data.previewText ?? "");
        setType(data.type);
        setTagsInput(data.tags?.join(", ") ?? "");
        setHtmlContent(data.htmlContent ?? "");
        setAudience(data.audience ?? { segment: "all" });
      } else {
        toast.error("Failed to load campaign");
      }
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const editable = campaign?.status === "draft" || campaign?.status === "scheduled";

  async function save() {
    if (!campaign) return;
    setSaving(true);
    try {
      const res = await fetch(`/next-api/admin/newsletter/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          previewText: previewText.trim() || undefined,
          htmlContent,
          audience,
          type,
          tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        toast.success("Campaign saved");
        load();
      } else {
        toast.error("Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!campaign || !testEmail.trim()) { toast.error("Enter an email address"); return; }
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${campaign.id}/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testEmail.trim() }),
    });
    if (res.ok) { toast.success("Test email sent"); setTestOpen(false); setTestEmail(""); }
    else toast.error("Failed to send test email");
  }

  async function schedule() {
    if (!campaign || !scheduleAt) { toast.error("Pick a date and time"); return; }
    const iso = new Date(scheduleAt).toISOString();
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${campaign.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: iso }),
    });
    if (res.ok) { toast.success("Campaign scheduled"); load(); }
    else toast.error("Schedule failed");
  }

  async function sendNow() {
    if (!campaign) return;
    if (!confirm("Send this campaign now to its audience? This cannot be undone.")) return;
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${campaign.id}/send-now`, { method: "POST" });
    if (res.ok) { toast.success("Campaign queued for sending"); load(); }
    else toast.error("Send failed");
  }

  async function cancel() {
    if (!campaign) return;
    if (!confirm("Cancel this scheduled campaign?")) return;
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${campaign.id}/cancel`, { method: "POST" });
    if (res.ok) { toast.success("Campaign cancelled"); load(); }
    else toast.error("Cancel failed");
  }

  async function duplicate() {
    if (!campaign) return;
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${campaign.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      toast.success("Campaign duplicated");
      router.push(`/admin/marketing/campaigns/${data.id}`);
    } else {
      toast.error("Duplicate failed");
    }
  }

  async function remove() {
    if (!campaign) return;
    if (!confirm("Delete this draft campaign?")) return;
    const res = await fetch(`/next-api/admin/newsletter/campaigns/${campaign.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Campaign deleted"); router.push("/admin/marketing/campaigns"); }
    else toast.error("Delete failed");
  }

  if (loading || !campaign) {
    return (
      <div className={shopStyles.container}>
        <span className={shopStyles.skeleton} style={{ height: 28, width: 240 }} />
      </div>
    );
  }

  return (
    <div className={shopStyles.container}>
      <div className={shopStyles.header}>
        <h1 className={shopStyles.title}>
          {campaign.title}{" "}
          <span className={`${styles.statusBadge} ${STATUS_CLASS[campaign.status]}`}>{STATUS_LABELS[campaign.status]}</span>
        </h1>
        <div className={styles.actionBar}>
          {editable && (
            <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          )}
          <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} onClick={() => setTestOpen(true)}>Send Test</button>
          {campaign.status === "draft" && (
            <button className={`${shopStyles.btn} ${shopStyles.btnSuccess}`} onClick={sendNow}>Send Now</button>
          )}
          {campaign.status === "scheduled" && (
            <button className={`${shopStyles.btn} ${shopStyles.btnDanger}`} onClick={cancel}>Cancel</button>
          )}
          {(campaign.status === "sent" || campaign.status === "cancelled") && (
            <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} onClick={duplicate}>Duplicate</button>
          )}
          {campaign.status === "draft" && (
            <button className={`${shopStyles.btn} ${shopStyles.btnDanger}`} onClick={remove}>Delete</button>
          )}
        </div>
      </div>

      {campaign.scheduledAt && (
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: -12, marginBottom: 16 }}>
          Scheduled for {new Date(campaign.scheduledAt).toLocaleString()}
        </p>
      )}
      {campaign.sentAt && (
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: -12, marginBottom: 16 }}>
          Sent on {new Date(campaign.sentAt).toLocaleString()}
        </p>
      )}

      <div className={styles.editorLayout}>
        <div className={styles.editorMain}>
          <div className={shopStyles.card}>
            <div className={shopStyles.formGrid}>
              <div className={shopStyles.formField}>
                <label>Internal title</label>
                <input className={shopStyles.input} value={title} onChange={e => setTitle(e.target.value)} disabled={!editable} />
              </div>
              <div className={shopStyles.formField}>
                <label>Email subject</label>
                <input className={shopStyles.input} value={subject} onChange={e => setSubject(e.target.value)} disabled={!editable} />
              </div>
              <div className={shopStyles.formField} style={{ gridColumn: "span 2" }}>
                <label>Preview text</label>
                <input className={shopStyles.input} value={previewText} onChange={e => setPreviewText(e.target.value)} disabled={!editable} placeholder="Shown after the subject line in most inboxes" />
              </div>
            </div>
          </div>

          <div className={shopStyles.card} style={{ padding: 0, overflow: "hidden" }}>
            <EmailEditor content={htmlContent} onChange={editable ? setHtmlContent : () => {}} />
          </div>
        </div>

        <div className={styles.editorSidebar}>
          <div className={shopStyles.card}>
            <div className={shopStyles.formField} style={{ marginBottom: 14 }}>
              <label>Campaign type</label>
              <select className={shopStyles.filterSelect} value={type} onChange={e => setType(e.target.value)} disabled={!editable} style={{ width: "100%" }}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={shopStyles.formField}>
              <label>Tags (comma-separated)</label>
              <input className={shopStyles.input} value={tagsInput} onChange={e => setTagsInput(e.target.value)} disabled={!editable} />
            </div>
          </div>

          <div className={shopStyles.card}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 10 }}>Audience</label>
            {editable ? (
              <AudienceSelector value={audience} onChange={setAudience} />
            ) : (
              <p style={{ fontSize: 13, color: "#6b7280" }}>{audience.segment}{audience.tags?.length ? `: ${audience.tags.join(", ")}` : ""}</p>
            )}
          </div>

          {campaign.status === "draft" && (
            <div className={shopStyles.card}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 10 }}>Schedule</label>
              <input
                className={shopStyles.input}
                type="datetime-local"
                value={scheduleAt}
                onChange={e => setScheduleAt(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} style={{ width: "100%" }} onClick={schedule}>
                Schedule
              </button>
            </div>
          )}
        </div>
      </div>

      {testOpen && (
        <div className={styles.modalOverlay} onClick={() => setTestOpen(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3>Send test email</h3>
            <div className={shopStyles.formField}>
              <label>Recipient email</label>
              <input className={shopStyles.input} type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} autoFocus />
            </div>
            <div className={styles.modalActions}>
              <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} onClick={() => setTestOpen(false)}>Cancel</button>
              <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} onClick={sendTest}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

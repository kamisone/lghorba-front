"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

export default function NewCampaignPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!title.trim() || !subject.trim()) {
      toast.error("Title and subject are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/next-api/admin/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), subject: subject.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/marketing/campaigns/${data.id}`);
      } else {
        toast.error("Failed to create campaign");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={shopStyles.container} style={{ maxWidth: 560 }}>
      <div className={shopStyles.header}>
        <h1 className={shopStyles.title}>New Campaign</h1>
      </div>

      <div className={shopStyles.card}>
        <div className={shopStyles.formField} style={{ marginBottom: 16 }}>
          <label>Title (internal name)</label>
          <input className={shopStyles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Summer Sale 2026" autoFocus />
        </div>
        <div className={shopStyles.formField} style={{ marginBottom: 16 }}>
          <label>Email subject</label>
          <input className={shopStyles.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. ☀️ Summer Sale — up to 30% off" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} onClick={() => router.push("/admin/marketing/campaigns")}>Cancel</button>
          <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} onClick={create} disabled={saving}>
            {saving ? "Creating…" : "Create & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import styles from "@/components/admin/marketing/MarketingAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

type SubscriberStatus = "subscribed" | "unsubscribed" | "bounced";

interface Subscriber {
  id: string;
  email: string;
  locale: string | null;
  status: SubscriberStatus;
  source: string | null;
  tags: string[];
  createdAt: string;
  lastActivityAt: string | null;
  unsubscribedAt: string | null;
}

const STATUS_LABELS: Record<SubscriberStatus, string> = {
  subscribed: "Subscribed",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
};

const STATUS_CLASS: Record<SubscriberStatus, string> = {
  subscribed: styles.subStatusSubscribed,
  unsubscribed: styles.subStatusUnsubscribed,
  bounced: styles.subStatusBounced,
};

const BULK_ACTIONS = [
  { value: "unsubscribe", label: "Unsubscribe" },
  { value: "resubscribe", label: "Resubscribe" },
  { value: "add_tag", label: "Add tag" },
  { value: "remove_tag", label: "Remove tag" },
  { value: "delete", label: "Delete" },
];

export default function SubscribersPage() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localeFilter, setLocaleFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("unsubscribe");
  const [bulkTag, setBulkTag] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addLocale, setAddLocale] = useState("");
  const [addSource, setAddSource] = useState("");
  const [addTags, setAddTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (search) qs.set("search", search);
      if (statusFilter) qs.set("status", statusFilter);
      if (localeFilter) qs.set("locale", localeFilter);
      if (sourceFilter) qs.set("source", sourceFilter);
      if (tagFilter) qs.set("tag", tagFilter);
      const res = await fetch(`/next-api/admin/newsletter/subscribers?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      } else {
        toast.error("Failed to load subscribers");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  const pages = Math.ceil(total / limit) || 1;

  function applyFilters() {
    setPage(1);
    setSelected(new Set());
    load();
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(prev =>
      prev.size === subscribers.length ? new Set() : new Set(subscribers.map(s => s.id))
    );
  }

  async function runBulkAction() {
    if (selected.size === 0) return;
    if ((bulkAction === "add_tag" || bulkAction === "remove_tag") && !bulkTag.trim()) {
      toast.error("Enter a tag first");
      return;
    }
    if (bulkAction === "delete" && !confirm(`Delete ${selected.size} subscriber(s)? This cannot be undone.`)) return;

    try {
      const res = await fetch("/next-api/admin/newsletter/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          action: bulkAction,
          ...(bulkAction === "add_tag" || bulkAction === "remove_tag" ? { tag: bulkTag.trim() } : {}),
        }),
      });
      if (res.ok) {
        toast.success("Bulk action applied");
        setSelected(new Set());
        setBulkTag("");
        load();
      } else {
        toast.error("Bulk action failed");
      }
    } catch {
      toast.error("Bulk action failed");
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Delete this subscriber?")) return;
    const res = await fetch(`/next-api/admin/newsletter/subscribers/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Subscriber deleted"); load(); }
    else toast.error("Delete failed");
  }

  async function changeStatus(id: string, status: SubscriberStatus) {
    const res = await fetch(`/next-api/admin/newsletter/subscribers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success("Subscriber updated"); load(); }
    else toast.error("Update failed");
  }

  async function createSubscriber() {
    if (!addEmail.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/next-api/admin/newsletter/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail.trim(),
          locale: addLocale.trim() || undefined,
          source: addSource.trim() || undefined,
          tags: addTags.trim() ? addTags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Subscriber added");
        setAddOpen(false);
        setAddEmail(""); setAddLocale(""); setAddSource(""); setAddTags("");
        setPage(1);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.message ?? "Failed to add subscriber");
      }
    } finally {
      setSaving(false);
    }
  }

  function exportUrl() {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (statusFilter) qs.set("status", statusFilter);
    if (localeFilter) qs.set("locale", localeFilter);
    if (sourceFilter) qs.set("source", sourceFilter);
    if (tagFilter) qs.set("tag", tagFilter);
    const q = qs.toString();
    return `/next-api/admin/newsletter/subscribers/export${q ? `?${q}` : ""}`;
  }

  return (
    <div className={shopStyles.container}>
      <div className={shopStyles.header}>
        <h1 className={shopStyles.title}>Subscribers</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} href={exportUrl()} target="_blank" rel="noreferrer">
            Export CSV
          </a>
          <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} onClick={() => setAddOpen(true)}>
            Add subscriber
          </button>
        </div>
      </div>

      <div className={shopStyles.filters}>
        <input
          className={shopStyles.filterInput}
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
        />
        <select className={shopStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); applyFilters(); }}>
          <option value="">All statuses</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
        <select className={shopStyles.filterSelect} value={localeFilter} onChange={e => { setLocaleFilter(e.target.value); applyFilters(); }}>
          <option value="">All locales</option>
          <option value="fr">French</option>
          <option value="en">English</option>
        </select>
        <input
          className={shopStyles.filterInput}
          placeholder="Source…"
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
        />
        <input
          className={shopStyles.filterInput}
          placeholder="Tag…"
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
        />
        <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} onClick={applyFilters}>Filter</button>
      </div>

      {selected.size > 0 && (
        <div className={styles.bulkBar}>
          <span>{selected.size} selected</span>
          <select className={shopStyles.filterSelect} value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
            {BULK_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          {(bulkAction === "add_tag" || bulkAction === "remove_tag") && (
            <input
              className={shopStyles.filterInput}
              placeholder="Tag name…"
              value={bulkTag}
              onChange={e => setBulkTag(e.target.value)}
            />
          )}
          <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} onClick={runBulkAction}>Apply</button>
        </div>
      )}

      <table className={shopStyles.table}>
        <thead>
          <tr>
            <th><input type="checkbox" checked={selected.size > 0 && selected.size === subscribers.length} onChange={toggleSelectAll} /></th>
            <th>Email</th>
            <th>Status</th>
            <th>Locale</th>
            <th>Source</th>
            <th>Tags</th>
            <th>Subscribed</th>
            <th>Last activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }, (_, j) => (
                    <td key={j}><span className={shopStyles.skeleton} style={{ height: 14, width: 70 }} /></td>
                  ))}
                </tr>
              ))
            : subscribers.map(s => (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                  <td>{s.email}</td>
                  <td>
                    <select
                      className={`${styles.statusBadge} ${STATUS_CLASS[s.status]}`}
                      style={{ border: "none", cursor: "pointer" }}
                      value={s.status}
                      onChange={e => changeStatus(s.id, e.target.value as SubscriberStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{s.locale ?? "—"}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{s.source ?? "—"}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{s.tags?.length ? s.tags.join(", ") : "—"}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString() : "—"}</td>
                  <td>
                    <button className={`${shopStyles.btn} ${shopStyles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => deleteOne(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
          }
          {!loading && subscribers.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                No subscribers found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={shopStyles.pagination}>
        <span className={shopStyles.pageInfo}>{total} subscribers</span>
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

      {addOpen && (
        <div className={styles.modalOverlay} onClick={() => setAddOpen(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3>Add subscriber</h3>
            <div className={shopStyles.formField} style={{ marginBottom: 10 }}>
              <label>Email</label>
              <input className={shopStyles.input} type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} autoFocus />
            </div>
            <div className={shopStyles.formField} style={{ marginBottom: 10 }}>
              <label>Locale</label>
              <input className={shopStyles.input} placeholder="fr / en" value={addLocale} onChange={e => setAddLocale(e.target.value)} />
            </div>
            <div className={shopStyles.formField} style={{ marginBottom: 10 }}>
              <label>Source</label>
              <input className={shopStyles.input} placeholder="admin-manual" value={addSource} onChange={e => setAddSource(e.target.value)} />
            </div>
            <div className={shopStyles.formField}>
              <label>Tags (comma-separated)</label>
              <input className={shopStyles.input} value={addTags} onChange={e => setAddTags(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={`${shopStyles.btn} ${shopStyles.btnSecondary}`} onClick={() => setAddOpen(false)}>Cancel</button>
              <button className={`${shopStyles.btn} ${shopStyles.btnPrimary}`} onClick={createSubscriber} disabled={saving}>
                {saving ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

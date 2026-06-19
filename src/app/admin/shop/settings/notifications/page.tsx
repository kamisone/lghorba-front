"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "./notifications.module.css";

interface Settings {
  smsEnabled: boolean;
  smsPhones: string[];
  emailEnabled: boolean;
  emailAddresses: string[];
  events: string[];
}

interface LogEntry {
  id: string;
  event: string;
  channel: "sms" | "email";
  recipient: string;
  status: "sent" | "failed" | "skipped";
  orderId: string | null;
  orderNumber: string | null;
  error: string | null;
  createdAt: string;
}

const EVENT_OPTIONS: { key: string; label: string; desc: string }[] = [
  { key: "payment_succeeded", label: "New Order (Payment Confirmed)", desc: "When a customer completes payment" },
  { key: "payment_failed",    label: "Payment Failed",               desc: "When a payment attempt fails" },
  { key: "order_cancelled",   label: "Order Cancelled",              desc: "When an order is cancelled" },
  { key: "order_shipped",     label: "Order Shipped",                desc: "When an order is marked as shipped" },
  { key: "order_delivered",   label: "Order Delivered",              desc: "When an order is marked as delivered" },
  { key: "low_stock",         label: "Low Stock Alert",              desc: "When product inventory runs low" },
];

const EVENT_LABELS: Record<string, string> = Object.fromEntries(EVENT_OPTIONS.map(e => [e.key, e.label]));

type Tab = "settings" | "logs";

export default function AdminNotificationsPage() {
  const [tab, setTab]           = useState<Tab>("settings");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const [phoneDraft, setPhoneDraft]   = useState("");
  const [emailDraft, setEmailDraft]   = useState("");

  const [logs, setLogs]           = useState<LogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logFilter, setLogFilter] = useState({ channel: "", event: "", status: "" });
  const [logsLoading, setLogsLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/next-api/admin/shop/notifications/settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  const loadLogs = useCallback(async (offset = 0, append = false) => {
    setLogsLoading(true);
    const qs = new URLSearchParams();
    if (logFilter.channel) qs.set("channel", logFilter.channel);
    if (logFilter.event)   qs.set("event",   logFilter.event);
    if (logFilter.status)  qs.set("status",  logFilter.status);
    qs.set("limit", "30");
    qs.set("offset", String(offset));
    try {
      const res = await fetch(`/next-api/admin/shop/notifications/logs?${qs}`);
      if (res.ok) {
        const data = await res.json() as { logs: LogEntry[]; total: number };
        setLogs(prev => append ? [...prev, ...data.logs] : data.logs);
        setLogsTotal(data.total);
      }
    } finally { setLogsLoading(false); }
  }, [logFilter]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const patch = (p: Partial<Settings>) => {
    setSettings(s => s ? { ...s, ...p } : s);
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/next-api/admin/shop/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettings(await res.json());
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally { setSaving(false); }
  };

  const addPhone = () => {
    const p = phoneDraft.trim();
    if (!p || !settings || settings.smsPhones.includes(p)) return;
    patch({ smsPhones: [...settings.smsPhones, p] });
    setPhoneDraft("");
  };

  const addEmail = () => {
    const e = emailDraft.trim().toLowerCase();
    if (!e || !settings || settings.emailAddresses.includes(e)) return;
    patch({ emailAddresses: [...settings.emailAddresses, e] });
    setEmailDraft("");
  };

  const toggleEvent = (key: string) => {
    if (!settings) return;
    const events = settings.events.includes(key)
      ? settings.events.filter(e => e !== key)
      : [...settings.events, key];
    patch({ events });
  };

  if (!settings) return <div className={styles.page}><p>Loading...</p></div>;

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Notifications</h1>
          <p className={styles.subtitle}>Configure SMS and email alerts for order events</p>
        </div>
      </div>

      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${tab === "settings" ? styles.tabActive : ""}`} onClick={() => setTab("settings")}>Settings</button>
        <button className={`${styles.tab} ${tab === "logs" ? styles.tabActive : ""}`} onClick={() => setTab("logs")}>Notification Log</button>
      </div>

      {tab === "settings" && <>

      <div className={styles.grid}>

        {/* ── SMS Settings ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>SMS Notifications</h2>
            <button
              className={`${styles.toggle} ${settings.smsEnabled ? styles.toggleOn : ""}`}
              onClick={() => patch({ smsEnabled: !settings.smsEnabled })}
              aria-label="Toggle SMS"
            />
          </div>
          <div className={styles.cardBody}>
            <div>
              <p className={styles.toggleLabel}>Phone numbers</p>
              <div className={styles.chipList}>
                {settings.smsPhones.map(p => (
                  <span key={p} className={styles.chip}>
                    {p}
                    <button className={styles.chipRemove} onClick={() => patch({ smsPhones: settings.smsPhones.filter(x => x !== p) })}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.addRow}>
              <input
                className={styles.addInput}
                placeholder="+33 6 12 34 56 78"
                value={phoneDraft}
                onChange={e => setPhoneDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addPhone(); }}
              />
              <button className={styles.addBtn} onClick={addPhone} disabled={!phoneDraft.trim()}>Add</button>
            </div>
          </div>
        </div>

        {/* ── Email Settings ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Email Notifications</h2>
            <button
              className={`${styles.toggle} ${settings.emailEnabled ? styles.toggleOn : ""}`}
              onClick={() => patch({ emailEnabled: !settings.emailEnabled })}
              aria-label="Toggle Email"
            />
          </div>
          <div className={styles.cardBody}>
            <div>
              <p className={styles.toggleLabel}>Email addresses</p>
              <div className={styles.chipList}>
                {settings.emailAddresses.map(e => (
                  <span key={e} className={styles.chip}>
                    {e}
                    <button className={styles.chipRemove} onClick={() => patch({ emailAddresses: settings.emailAddresses.filter(x => x !== e) })}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.addRow}>
              <input
                className={styles.addInput}
                type="email"
                placeholder="admin@example.com"
                value={emailDraft}
                onChange={e => setEmailDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addEmail(); }}
              />
              <button className={styles.addBtn} onClick={addEmail} disabled={!emailDraft.trim()}>Add</button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Events ── */}
      <div className={styles.card} style={{ marginTop: 24 }}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Notification Events</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.eventList}>
            {EVENT_OPTIONS.map(ev => (
              <label key={ev.key} className={styles.eventRow}>
                <input
                  type="checkbox"
                  className={styles.eventCheckbox}
                  checked={settings.events.includes(ev.key)}
                  onChange={() => toggleEvent(ev.key)}
                />
                <div>
                  <span className={styles.eventLabel}>{ev.label}</span>
                  <br />
                  <span className={styles.eventDesc}>{ev.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Save ── */}
      <div className={styles.saveBar}>
        {saved && <span className={styles.saved}>Settings saved</span>}
        <button className={styles.saveBtn} onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      </>}

      {/* ── Notification Logs ── */}
      {tab === "logs" && <div className={styles.logsSection}>
        <div className={styles.logsHeader}>
          <h2 className={styles.logsTitle}>Notification Log</h2>
          <div className={styles.logsFilters}>
            <select className={styles.filterSelect} value={logFilter.channel} onChange={e => setLogFilter(f => ({ ...f, channel: e.target.value }))}>
              <option value="">All channels</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <select className={styles.filterSelect} value={logFilter.event} onChange={e => setLogFilter(f => ({ ...f, event: e.target.value }))}>
              <option value="">All events</option>
              {EVENT_OPTIONS.map(ev => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
            </select>
            <select className={styles.filterSelect} value={logFilter.status} onChange={e => setLogFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
        </div>

        {logs.length === 0 && !logsLoading ? (
          <div className={styles.emptyLogs}>No notifications sent yet</div>
        ) : (
          <>
            <table className={styles.logsTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Channel</th>
                  <th>Event</th>
                  <th>Recipient</th>
                  <th>Order</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={log.channel === "sms" ? styles.channelSms : styles.channelEmail}>
                        {log.channel.toUpperCase()}
                      </span>
                    </td>
                    <td>{EVENT_LABELS[log.event] ?? log.event}</td>
                    <td>{log.recipient}</td>
                    <td>{log.orderNumber ? `#${log.orderNumber}` : "—"}</td>
                    <td>
                      <span className={
                        log.status === "sent"    ? styles.statusSent :
                        log.status === "failed"  ? styles.statusFailed :
                        styles.statusSkipped
                      }>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length < logsTotal && (
              <button className={styles.loadMore} onClick={() => loadLogs(logs.length, true)} disabled={logsLoading}>
                {logsLoading ? "Loading..." : `Load more (${logsTotal - logs.length} remaining)`}
              </button>
            )}
          </>
        )}
      </div>}
    </div>
  );
}

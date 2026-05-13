"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBusinessTz } from "@/contexts/TzContext";
import { fmtDateTime } from "@/lib/dateUtils";
import styles from "./AdminReminders.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReminderSettings {
  id: number;
  key: string;
  enabled: boolean;
  reminderMinutesBefore: number;
  recipientPhones: string[];
  smsTemplate: string | null;
  emailEnabled: boolean;
  recipientEmails: string[];
  emailSubject: string | null;
  emailTemplate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReminderLog {
  id: string;
  bookingId: string;
  scheduledFor: string;
  sentAt: string | null;
  status: "scheduled" | "sent" | "failed" | "skipped" | "cancelled";
  errorMessage: string | null;
  smsStatus: string | null;
  recipientPhone: string | null;
  messageBody: string | null;
  smsError: string | null;
  emailStatus: string | null;
  recipientEmail: string | null;
  emailError: string | null;
  attemptCount: number;
  createdAt: string;
}

interface LogsPage {
  items: ReminderLog[];
  total: number;
  page: number;
  limit: number;
}

type Tab        = "settings" | "template" | "logs";
type Channel    = "sms" | "email";
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SMS_TEMPLATE =
  `[RAPPEL] Réservation dans {{minutesBefore}}min\n` +
  `Client : {{customerName}} | {{customerPhone}}\n` +
  `Véhicule : {{carDetails}}\n` +
  `Source : {{source}}\n` +
  `Début : {{startDateTime}}\n` +
  `Fin : {{endDateTime}}\n` +
  `Prix : {{totalPrice}}€\n` +
  `Réf : {{reservationId}}`;

const DEFAULT_EMAIL_SUBJECT =
  `[Rappel] Réservation {{carDetails}} – {{startDateTime}}`;

const DEFAULT_EMAIL_TEMPLATE =
  `Rappel de réservation dans {{minutesBefore}} minutes.\n\n` +
  `Client : {{customerName}} ({{customerPhone}})\n` +
  `Véhicule : {{carDetails}}\n` +
  `Source : {{source}}\n` +
  `Début : {{startDateTime}}\n` +
  `Fin : {{endDateTime}}\n` +
  `Lieu : {{location}}\n` +
  `Prix : {{totalPrice}} €\n` +
  `Référence : {{reservationId}}`;

const PLACEHOLDERS = [
  "{{minutesBefore}}","{{customerName}}","{{customerPhone}}",
  "{{carDetails}}","{{carBrand}}","{{carModel}}","{{source}}",
  "{{startDateTime}}","{{endDateTime}}","{{location}}",
  "{{totalPrice}}","{{reservationId}}","{{bookingId}}",
];

const SAMPLE_VARS: Record<string, string> = {
  minutesBefore: "60", customerName: "Jean Dupont",
  customerPhone: "+33 6 12 34 56 78", carDetails: "Renault Kangoo VU",
  carBrand: "Renault", carModel: "Kangoo", carName: "Kangoo VU",
  source: "turo", startDateTime: "01/06/2025 09:00",
  endDateTime: "05/06/2025 18:00", location: "12 Rue de la Paix, Paris",
  totalPrice: "320.00", reservationId: "RES-001", bookingId: "abc12345",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPreview(t: string) {
  return t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => SAMPLE_VARS[k] ?? `{{${k}}}`);
}


function settingsDirtyCheck(a: ReminderSettings | null, b: ReminderSettings | null) {
  if (!a || !b) return false;
  return (
    a.enabled               !== b.enabled               ||
    a.reminderMinutesBefore !== b.reminderMinutesBefore ||
    a.emailEnabled          !== b.emailEnabled          ||
    JSON.stringify(a.recipientPhones) !== JSON.stringify(b.recipientPhones) ||
    JSON.stringify(a.recipientEmails) !== JSON.stringify(b.recipientEmails)
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OnOffSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`${styles.onoff} ${on ? styles.onoffOn : styles.onoffOff}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
      type="button"
    >
      <span className={styles.onoffThumb} />
      <span className={styles.onoffLabel}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

function SaveBtn({
  dirty, status, onClick, label = "Save",
}: {
  dirty: boolean; status: SaveStatus; onClick: () => void; label?: string;
}) {
  const busy = status === "saving";
  return (
    <button
      className={`${styles.saveBtn} ${
        status === "saved"  ? styles.saveBtnSaved  :
        status === "error"  ? styles.saveBtnError  :
        dirty               ? styles.saveBtnDirty  :
        styles.saveBtnClean
      }`}
      onClick={onClick}
      disabled={busy || (!dirty && status !== "error")}
      type="button"
    >
      {status === "saving" && <span className={styles.spinner} />}
      {status === "saved"  && <span>✓</span>}
      {status === "error"  ? "Retry" :
       status === "saving" ? "Saving…" :
       status === "saved"  ? "Saved"  :
       dirty               ? label    : "No changes"}
    </button>
  );
}

function ChannelPill({ status }: { status: string | null }) {
  if (!status) return <span className={styles.pillNa}>—</span>;
  const c = status === "sent" ? styles.pillSent : status === "failed" ? styles.pillFailed : styles.pillSkipped;
  return <span className={`${styles.pill} ${c}`}>{status}</span>;
}

function StatusBadge({ status }: { status: ReminderLog["status"] }) {
  const c: Record<string, string> = {
    scheduled: styles.statusScheduled, sent: styles.statusSent,
    failed: styles.statusFailed, skipped: styles.statusSkipped, cancelled: styles.statusCancelled,
  };
  return <span className={`${styles.statusBadge} ${c[status] ?? ""}`}>{status}</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminReminders() {
  const tz           = useBusinessTz();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const rawTab     = searchParams.get("tab");
  const rawChannel = searchParams.get("channel");
  const tab: Tab     = rawTab === "template" || rawTab === "logs" ? rawTab : "settings";
  const channel: Channel = rawChannel === "email" ? "email" : "sms";

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(searchParams.toString());
    next === "settings" ? p.delete("tab") : p.set("tab", next);
    router.replace(`?${p}`, { scroll: false });
  };
  const setChannel = (next: Channel) => {
    const p = new URLSearchParams(searchParams.toString());
    next === "sms" ? p.delete("channel") : p.set("channel", next);
    router.replace(`?${p}`, { scroll: false });
  };

  // ── Server snapshots ──
  const [serverSettings,      setServerSettings]      = useState<ReminderSettings | null>(null);
  const [serverSmsTemplate,   setServerSmsTemplate]   = useState(DEFAULT_SMS_TEMPLATE);
  const [serverEmailSubject,  setServerEmailSubject]  = useState(DEFAULT_EMAIL_SUBJECT);
  const [serverEmailTemplate, setServerEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);

  // ── Local editable copies ──
  const [local,              setLocal]              = useState<ReminderSettings | null>(null);
  const [localSmsTpl,        setLocalSmsTpl]        = useState(DEFAULT_SMS_TEMPLATE);
  const [localEmailSubject,  setLocalEmailSubject]  = useState(DEFAULT_EMAIL_SUBJECT);
  const [localEmailTpl,      setLocalEmailTpl]      = useState(DEFAULT_EMAIL_TEMPLATE);

  // ── Save statuses ──
  const [settingsSave,  setSettingsSave]  = useState<SaveStatus>("idle");
  const [smsTplSave,    setSmsTplSave]    = useState<SaveStatus>("idle");
  const [emailTplSave,  setEmailTplSave]  = useState<SaveStatus>("idle");
  const [settingsErr,   setSettingsErr]   = useState("");
  const [smsTplErr,     setSmsTplErr]     = useState("");
  const [emailTplErr,   setEmailTplErr]   = useState("");

  // ── Phone / email add inputs ──
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // ── Loading ──
  const [loading, setLoading] = useState(true);

  // ── Template textarea refs ──
  const smsRef   = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLTextAreaElement>(null);

  // ── Logs ──
  const [logs,        setLogs]        = useState<LogsPage | null>(null);
  const [logsPage,    setLogsPage]    = useState(1);
  const [logStatus,   setLogStatus]   = useState("");
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Dirty flags ──
  const settingsDirty = settingsDirtyCheck(local, serverSettings);
  const smsTplDirty   = localSmsTpl !== serverSmsTemplate;
  const emailTplDirty = localEmailSubject !== serverEmailSubject || localEmailTpl !== serverEmailTemplate;

  // ── Auto-clear "saved" ──
  useEffect(() => {
    if (settingsSave !== "saved") return;
    const t = setTimeout(() => setSettingsSave("idle"), 2500);
    return () => clearTimeout(t);
  }, [settingsSave]);

  useEffect(() => {
    if (smsTplSave !== "saved") return;
    const t = setTimeout(() => setSmsTplSave("idle"), 2500);
    return () => clearTimeout(t);
  }, [smsTplSave]);

  useEffect(() => {
    if (emailTplSave !== "saved") return;
    const t = setTimeout(() => setEmailTplSave("idle"), 2500);
    return () => clearTimeout(t);
  }, [emailTplSave]);

  // ── Fetch settings ──
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/next-api/notifications/reminders/settings");
      if (!res.ok) return;
      const data: ReminderSettings = await res.json();
      const sms   = data.smsTemplate   ?? DEFAULT_SMS_TEMPLATE;
      const esubj = data.emailSubject  ?? DEFAULT_EMAIL_SUBJECT;
      const etpl  = data.emailTemplate ?? DEFAULT_EMAIL_TEMPLATE;
      setServerSettings(data);     setLocal(data);
      setServerSmsTemplate(sms);   setLocalSmsTpl(sms);
      setServerEmailSubject(esubj); setLocalEmailSubject(esubj);
      setServerEmailTemplate(etpl); setLocalEmailTpl(etpl);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Generic PUT ──
  async function put(
    body: object,
    setStatus: (s: SaveStatus) => void,
    setErr: (e: string) => void,
  ): Promise<boolean> {
    setStatus("saving");
    setErr("");
    try {
      const res = await fetch("/next-api/notifications/reminders/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setErr(e?.message ?? "Save failed");
        setStatus("error");
        return false;
      }
      return true;
    } catch {
      setErr("Network error");
      setStatus("error");
      return false;
    }
  }

  // ── Save handlers ──
  const saveSettings = async () => {
    if (!local) return;
    const ok = await put(
      {
        enabled:               local.enabled,
        reminderMinutesBefore: local.reminderMinutesBefore,
        recipientPhones:       local.recipientPhones,
        emailEnabled:          local.emailEnabled,
        recipientEmails:       local.recipientEmails,
      },
      setSettingsSave, setSettingsErr,
    );
    if (ok) { setServerSettings({ ...serverSettings!, ...local }); setSettingsSave("saved"); }
  };

  const saveSmsTpl = async () => {
    const ok = await put({ smsTemplate: localSmsTpl }, setSmsTplSave, setSmsTplErr);
    if (ok) { setServerSmsTemplate(localSmsTpl); setSmsTplSave("saved"); }
  };

  const saveEmailTpl = async () => {
    const ok = await put(
      { emailSubject: localEmailSubject, emailTemplate: localEmailTpl },
      setEmailTplSave, setEmailTplErr,
    );
    if (ok) { setServerEmailSubject(localEmailSubject); setServerEmailTemplate(localEmailTpl); setEmailTplSave("saved"); }
  };

  // ── Recipient management ──
  const addPhone = () => {
    const v = newPhone.trim();
    if (!v || !local || local.recipientPhones.includes(v)) { setNewPhone(""); return; }
    setLocal({ ...local, recipientPhones: [...local.recipientPhones, v] });
    setNewPhone("");
  };
  const removePhone = (v: string) => local && setLocal({ ...local, recipientPhones: local.recipientPhones.filter(p => p !== v) });

  const addEmail = () => {
    const v = newEmail.trim();
    if (!v || !local || local.recipientEmails.includes(v)) { setNewEmail(""); return; }
    setLocal({ ...local, recipientEmails: [...local.recipientEmails, v] });
    setNewEmail("");
  };
  const removeEmail = (v: string) => local && setLocal({ ...local, recipientEmails: local.recipientEmails.filter(e => e !== v) });

  // ── Placeholder insert ──
  const insert = (ph: string, ref: React.RefObject<HTMLTextAreaElement | null>, val: string, set: (v: string) => void) => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart ?? val.length;
    const e = ta.selectionEnd   ?? s;
    set(val.slice(0, s) + ph + val.slice(e));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + ph.length; ta.focus(); }, 0);
  };

  // ── Fetch logs ──
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(logsPage), limit: "20" });
      if (logStatus) qs.set("status", logStatus);
      const res  = await fetch(`/next-api/notifications/reminders/logs?${qs}`);
      const data = await res.json();
      setLogs(data);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  }, [logsPage, logStatus]);

  useEffect(() => { if (tab === "logs") fetchLogs(); }, [tab, fetchLogs]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>SMS &amp; Email Reminders</h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["settings", "template", "logs"] as Tab[]).map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`} onClick={() => setTab(t)}>
            {t === "settings" ? "Settings" : t === "template" ? "Templates" : "Logs"}
          </button>
        ))}
      </div>

      {/* ── Settings ── */}
      {tab === "settings" && (
        <div className={styles.settingsWrap}>
          {loading ? (
            <div className={styles.card}>
              <div className={styles.skeleton}>
                {[100, 80, 60].map(w => <div key={w} className={styles.skeletonRow} style={{ width: `${w}%` }} />)}
              </div>
            </div>
          ) : local === null ? (
            <div className={styles.errorBanner}>Could not load settings. Refresh the page.</div>
          ) : (
            <>
              {/* Timing */}
              <div className={styles.card}>
                <div className={styles.timingRow}>
                  <div>
                    <div className={styles.rowLabel}>Reminder timing</div>
                    <div className={styles.rowSub}>Applied to both SMS and email — sent this many minutes before booking start</div>
                  </div>
                  <div className={styles.timingInput}>
                    <input
                      className={styles.input}
                      type="number" min={5} max={1440}
                      value={local.reminderMinutesBefore}
                      onChange={e => setLocal({ ...local, reminderMinutesBefore: Number(e.target.value) })}
                      aria-label="Minutes before booking"
                    />
                    <span className={styles.inputSuffix}>min before start</span>
                  </div>
                </div>
              </div>

              {/* SMS card */}
              <div className={`${styles.channelCard} ${local.enabled ? styles.channelCardOn : styles.channelCardOff}`}>
                <div className={styles.channelCardHeader}>
                  <div className={styles.channelCardMeta}>
                    <span className={`material-symbols-outlined ${styles.channelIcon}`}>sms</span>
                    <div>
                      <div className={styles.channelName}>SMS Reminders</div>
                      <div className={styles.channelDesc}>Queue an outgoing SMS before each booking starts</div>
                    </div>
                  </div>
                  <OnOffSwitch on={local.enabled} onChange={v => setLocal({ ...local, enabled: v })} />
                </div>

                <div className={`${styles.channelBody} ${!local.enabled ? styles.channelBodyDisabled : ""}`}>
                  <div className={styles.recipientLabel}>Phone recipients</div>
                  <div className={styles.chipList}>
                    {local.recipientPhones.map(p => (
                      <span key={p} className={styles.chip}>
                        <span className="material-symbols-outlined" style={{ fontSize: "0.8rem", opacity: 0.55 }}>phone</span>
                        {p}
                        <button className={styles.chipX} onClick={() => removePhone(p)} disabled={!local.enabled}>
                          <span className="material-symbols-outlined" style={{ fontSize: "0.8rem" }}>close</span>
                        </button>
                      </span>
                    ))}
                    {local.recipientPhones.length === 0 && (
                      <span className={styles.noRecipients}>No phones configured — SMS will be skipped</span>
                    )}
                  </div>
                  <div className={styles.addRow}>
                    <input
                      className={styles.addInput}
                      type="tel" placeholder="+33 6 12 34 56 78"
                      value={newPhone} onChange={e => setNewPhone(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPhone(); } }}
                      disabled={!local.enabled}
                    />
                    <button className={styles.addBtn} onClick={addPhone} disabled={!newPhone.trim() || !local.enabled}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Email card */}
              <div className={`${styles.channelCard} ${local.emailEnabled ? styles.channelCardOn : styles.channelCardOff}`}>
                <div className={styles.channelCardHeader}>
                  <div className={styles.channelCardMeta}>
                    <span className={`material-symbols-outlined ${styles.channelIcon}`}>mail</span>
                    <div>
                      <div className={styles.channelName}>Email Reminders</div>
                      <div className={styles.channelDesc}>Send an email before each booking starts (requires SMTP)</div>
                    </div>
                  </div>
                  <OnOffSwitch on={local.emailEnabled} onChange={v => setLocal({ ...local, emailEnabled: v })} />
                </div>

                <div className={`${styles.channelBody} ${!local.emailEnabled ? styles.channelBodyDisabled : ""}`}>
                  <div className={styles.recipientLabel}>Email recipients</div>
                  <div className={styles.chipList}>
                    {local.recipientEmails.map(e => (
                      <span key={e} className={styles.chip}>
                        <span className="material-symbols-outlined" style={{ fontSize: "0.8rem", opacity: 0.55 }}>mail</span>
                        {e}
                        <button className={styles.chipX} onClick={() => removeEmail(e)} disabled={!local.emailEnabled}>
                          <span className="material-symbols-outlined" style={{ fontSize: "0.8rem" }}>close</span>
                        </button>
                      </span>
                    ))}
                    {local.recipientEmails.length === 0 && (
                      <span className={styles.noRecipients}>No addresses configured — email will be skipped</span>
                    )}
                  </div>
                  <div className={styles.addRow}>
                    <input
                      className={styles.addInput}
                      type="email" placeholder="admin@example.com"
                      value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                      disabled={!local.emailEnabled}
                    />
                    <button className={styles.addBtn} onClick={addEmail} disabled={!newEmail.trim() || !local.emailEnabled}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Save bar */}
              <div className={styles.saveBar}>
                {settingsSave === "error" && <span className={styles.saveBarErr}>{settingsErr}</span>}
                {settingsDirty && settingsSave === "idle" && (
                  <span className={styles.unsavedBadge}>Unsaved changes</span>
                )}
                <SaveBtn dirty={settingsDirty} status={settingsSave} onClick={saveSettings} label="Save settings" />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Templates ── */}
      {tab === "template" && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardTitle}>Message Templates</p>
            <div className={styles.channelSwitch}>
              <button
                className={`${styles.channelSwitchBtn} ${channel === "sms" ? styles.channelSwitchActive : ""}`}
                onClick={() => setChannel("sms")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>sms</span>SMS
              </button>
              <button
                className={`${styles.channelSwitchBtn} ${channel === "email" ? styles.channelSwitchActive : ""}`}
                onClick={() => setChannel("email")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>mail</span>Email
              </button>
            </div>
          </div>

          {/* Placeholders */}
          <div className={styles.placeholderSection}>
            <div className={styles.templateLabel}>Click a placeholder to insert at cursor</div>
            <div className={styles.placeholdersGrid}>
              {PLACEHOLDERS.map(ph => (
                <button key={ph} className={styles.placeholder} onClick={() => {
                  if (channel === "sms") insert(ph, smsRef,   localSmsTpl,   setLocalSmsTpl);
                  else                   insert(ph, emailRef, localEmailTpl, setLocalEmailTpl);
                }}>{ph}</button>
              ))}
            </div>
          </div>

          {/* SMS editor */}
          {channel === "sms" && (
            <>
              <div className={styles.templateGrid}>
                <div>
                  <div className={styles.templateLabel}>
                    SMS template
                    <span className={styles.charCount}>{localSmsTpl.length} chars</span>
                  </div>
                  <textarea
                    ref={smsRef}
                    className={styles.textarea}
                    value={localSmsTpl}
                    onChange={e => setLocalSmsTpl(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <div>
                  <div className={styles.templateLabel}>Live preview · sample data</div>
                  <div className={styles.preview}>{renderPreview(localSmsTpl)}</div>
                </div>
              </div>
              <div className={styles.tplSaveBar}>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setLocalSmsTpl(DEFAULT_SMS_TEMPLATE)}>
                  Reset to default
                </button>
                <div className={styles.tplSaveRight}>
                  {smsTplSave === "error" && <span className={styles.saveBarErr}>{smsTplErr}</span>}
                  {smsTplDirty && smsTplSave === "idle" && <span className={styles.unsavedBadge}>Unsaved changes</span>}
                  <SaveBtn dirty={smsTplDirty} status={smsTplSave} onClick={saveSmsTpl} label="Save SMS template" />
                </div>
              </div>
            </>
          )}

          {/* Email editor */}
          {channel === "email" && (
            <>
              <div style={{ marginBottom: "0.75rem" }}>
                <div className={styles.templateLabel}>Subject line</div>
                <input
                  className={styles.subjectInput}
                  type="text"
                  value={localEmailSubject}
                  onChange={e => setLocalEmailSubject(e.target.value)}
                  placeholder={DEFAULT_EMAIL_SUBJECT}
                />
                <div className={styles.subjectPreview}>Preview: <em>{renderPreview(localEmailSubject)}</em></div>
              </div>
              <div className={styles.templateGrid}>
                <div>
                  <div className={styles.templateLabel}>
                    Email body
                    <span className={styles.charCount}>{localEmailTpl.length} chars</span>
                  </div>
                  <textarea
                    ref={emailRef}
                    className={styles.textarea}
                    value={localEmailTpl}
                    onChange={e => setLocalEmailTpl(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <div>
                  <div className={styles.templateLabel}>Live preview · sample data</div>
                  <div className={styles.preview}>{renderPreview(localEmailTpl)}</div>
                </div>
              </div>
              <div className={styles.tplSaveBar}>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => { setLocalEmailSubject(DEFAULT_EMAIL_SUBJECT); setLocalEmailTpl(DEFAULT_EMAIL_TEMPLATE); }}
                >
                  Reset to default
                </button>
                <div className={styles.tplSaveRight}>
                  {emailTplSave === "error" && <span className={styles.saveBarErr}>{emailTplErr}</span>}
                  {emailTplDirty && emailTplSave === "idle" && <span className={styles.unsavedBadge}>Unsaved changes</span>}
                  <SaveBtn dirty={emailTplDirty} status={emailTplSave} onClick={saveEmailTpl} label="Save email template" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Logs ── */}
      {tab === "logs" && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Reminder Logs</p>
          <div className={styles.filterRow}>
            <select className={styles.select} value={logStatus}
              onChange={e => { setLogStatus(e.target.value); setLogsPage(1); }}>
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={fetchLogs} disabled={logsLoading}>
              {logsLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {logsLoading ? (
            <div className={styles.skeleton}>
              {[1,2,3].map(i => <div key={i} className={styles.skeletonRow} />)}
            </div>
          ) : !logs || logs.items.length === 0 ? (
            <div className={styles.empty}>No reminder logs found.</div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Status</th><th>Booking</th><th>Scheduled for</th>
                      <th>SMS</th><th>SMS recipient</th>
                      <th>Email</th><th>Email recipient</th>
                      <th>Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.items.map(log => (
                      <tr key={log.id}>
                        <td><StatusBadge status={log.status} /></td>
                        <td><span className={styles.mono}>{log.bookingId.slice(0, 8)}…</span></td>
                        <td className={styles.nowrap}>{log.scheduledFor ? fmtDateTime(log.scheduledFor, tz, "fr-FR") : "—"}</td>
                        <td><ChannelPill status={log.smsStatus} /></td>
                        <td className={styles.mono}>{log.recipientPhone ?? "—"}</td>
                        <td><ChannelPill status={log.emailStatus} /></td>
                        <td className={styles.mono}>{log.recipientEmail ?? "—"}</td>
                        <td style={{ textAlign: "center" }}>{log.attemptCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span className={styles.paginationInfo}>{logs.total} total</span>
                <button className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage <= 1}>‹ Prev</button>
                <span className={styles.paginationInfo}>Page {logsPage} / {Math.max(1, Math.ceil(logs.total / logs.limit))}</span>
                <button className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setLogsPage(p => p + 1)} disabled={logsPage >= Math.ceil(logs.total / logs.limit)}>Next ›</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

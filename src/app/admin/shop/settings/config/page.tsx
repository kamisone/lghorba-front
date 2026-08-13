"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

export default function CommerceConfigPage() {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [rules, setRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [botValue, setBotValue] = useState("");
  const [botPatterns, setBotPatterns] = useState<string[]>([]);
  const [botLoading, setBotLoading] = useState(true);
  const [botSaving, setBotSaving] = useState(false);

  useEffect(() => {
    fetch("/next-api/admin/shop/analytics-excluded-ips")
      .then((r) => (r.ok ? r.json() : { rules: [] }))
      .then((data) => {
        const list: string[] = Array.isArray(data.rules) ? data.rules : [];
        setRules(list);
        setValue(list.join("\n"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/next-api/admin/shop/analytics-bot-user-agents")
      .then((r) => (r.ok ? r.json() : { patterns: [] }))
      .then((data) => {
        const list: string[] = Array.isArray(data.patterns) ? data.patterns : [];
        setBotPatterns(list);
        setBotValue(list.join("\n"));
      })
      .catch(() => {})
      .finally(() => setBotLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/next-api/admin/shop/analytics-excluded-ips", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      toast.error("Failed to save the exclusion list");
      setSaving(false);
      return;
    }
    const data: { rules: string[]; invalid: string[] } = await res.json();
    setRules(data.rules);
    setValue(data.rules.join("\n"));
    // Report rejected entries rather than letting the admin assume a typo took
    // effect and wonder later why their own visits still count.
    if (data.invalid.length) {
      toast.error(
        `Ignored ${data.invalid.length} invalid entr${data.invalid.length === 1 ? "y" : "ies"}: ${data.invalid.join(", ")}`,
      );
    } else {
      toast.success(
        data.rules.length
          ? `Saved — ${data.rules.length} address${data.rules.length === 1 ? "" : "es"} excluded from analytics`
          : "Saved — no addresses excluded",
      );
    }
    setSaving(false);
  }

  async function saveBotPatterns() {
    setBotSaving(true);
    const res = await fetch("/next-api/admin/shop/analytics-bot-user-agents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: botValue }),
    });
    if (!res.ok) {
      toast.error("Failed to save the bot filter list");
      setBotSaving(false);
      return;
    }
    const data: { patterns: string[] } = await res.json();
    setBotPatterns(data.patterns);
    setBotValue(data.patterns.join("\n"));
    toast.success(
      data.patterns.length
        ? `Saved — ${data.patterns.length} pattern${data.patterns.length === 1 ? "" : "s"} filtered from analytics`
        : "Saved — bot filtering disabled",
    );
    setBotSaving(false);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Commerce Configuration</h1>
      </div>

      <div
        style={{
          background: "var(--color-white)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: 24,
          maxWidth: 720,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-admin-primary)", margin: "0 0 6px" }}>
          Analytics IP exclusions
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
          Traffic from these addresses is not recorded at all — no views, cart events
          or checkout steps. Use it to keep your own team&rsquo;s browsing out of the
          figures you use to decide what to stock.
        </p>

        <label
          htmlFor="excluded-ips"
          style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-label)", marginBottom: 6 }}
        >
          One per line
        </label>
        <textarea
          id="excluded-ips"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          rows={7}
          spellCheck={false}
          placeholder={"81.20.4.7\n81.20.4.0/24\n2a01:e0a::1"}
          style={{
            width: "100%",
            padding: "11px 13px",
            border: "1.5px solid var(--color-border)",
            borderRadius: 9,
            fontSize: 13.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: 1.6,
            color: "var(--color-text-primary)",
            background: "var(--color-white)",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
        <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text-muted)", margin: "8px 0 0" }}>
          Accepts a single address (<code>81.20.4.7</code>), an IPv4 range in CIDR
          notation (<code>81.20.4.0/24</code> covers .0&ndash;.255), or an IPv6 address.
          IPv6 is matched exactly — ranges are IPv4 only.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className={styles.newBtn}
            style={{
              border: "none",
              cursor: saving || loading ? "not-allowed" : "pointer",
              opacity: saving || loading ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            {loading
              ? "Loading…"
              : rules.length === 0
                ? "No exclusions — all traffic is recorded"
                : `${rules.length} address${rules.length === 1 ? "" : "es"} currently excluded`}
          </span>
        </div>

        <p
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--color-text-muted)",
            margin: "16px 0 0",
            paddingTop: 14,
            borderTop: "1px solid var(--color-border)",
          }}
        >
          Applies to events recorded from now on. Anything already counted stays in
          the reports — and a change can take up to a minute to reach every server.
        </p>
      </div>

      <div
        style={{
          background: "var(--color-white)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: 24,
          maxWidth: 720,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-admin-primary)", margin: "0 0 6px" }}>
          Bot / crawler filtering
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
          A request whose User-Agent contains any of these (case-insensitive) is not
          recorded. Pre-filled with a broad default list of known crawlers and
          scripted clients — edit freely, an empty list disables bot filtering.
        </p>

        <label
          htmlFor="bot-user-agents"
          style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-label)", marginBottom: 6 }}
        >
          One per line
        </label>
        <textarea
          id="bot-user-agents"
          value={botValue}
          onChange={(e) => setBotValue(e.target.value)}
          disabled={botLoading}
          rows={7}
          spellCheck={false}
          placeholder={"bot\nspider\nfacebookexternalhit\ncurl/"}
          style={{
            width: "100%",
            padding: "11px 13px",
            border: "1.5px solid var(--color-border)",
            borderRadius: 9,
            fontSize: 13.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: 1.6,
            color: "var(--color-text-primary)",
            background: "var(--color-white)",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
        <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text-muted)", margin: "8px 0 0" }}>
          A request with no User-Agent header at all is also treated as a bot —
          every real browser sends one.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
          <button
            type="button"
            onClick={saveBotPatterns}
            disabled={botSaving || botLoading}
            className={styles.newBtn}
            style={{
              border: "none",
              cursor: botSaving || botLoading ? "not-allowed" : "pointer",
              opacity: botSaving || botLoading ? 0.6 : 1,
            }}
          >
            {botSaving ? "Saving…" : "Save"}
          </button>
          <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            {botLoading
              ? "Loading…"
              : botPatterns.length === 0
                ? "No patterns — bot filtering disabled"
                : `${botPatterns.length} pattern${botPatterns.length === 1 ? "" : "s"} currently filtered`}
          </span>
        </div>

        <p
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--color-text-muted)",
            margin: "16px 0 0",
            paddingTop: 14,
            borderTop: "1px solid var(--color-border)",
          }}
        >
          Applies to events recorded from now on. Anything already counted stays in
          the reports — and a change can take up to a minute to reach every server.
        </p>
      </div>
    </div>
  );
}

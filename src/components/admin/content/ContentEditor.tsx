"use client";

import { useState, useEffect, useCallback } from "react";
import RichTextEditor from "./RichTextEditor";
import styles from "./ContentEditor.module.css";
import { ChevronUp, ChevronDown, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageSection {
  title: string;
  body: string;
}

interface PageStat {
  num: string;
  label: string;
}

interface PageContentData {
  title: string;
  intro: string;
  sections: PageSection[];
  stats?: PageStat[];
}

type Slug = "about" | "privacy" | "legal" | "cookies";
type Locale = "fr" | "en";

const PAGES: { slug: Slug; label: string }[] = [
  { slug: "about",   label: "À propos"        },
  { slug: "privacy", label: "Privacy Policy"   },
  { slug: "legal",   label: "Mentions légales" },
  { slug: "cookies", label: "Cookie Policy"    },
];

const DEFAULT_STATS: PageStat[] = [
  { num: "", label: "" },
  { num: "", label: "" },
  { num: "", label: "" },
];

const EMPTY: PageContentData = { title: "", intro: "", sections: [], stats: [] };

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContentEditor() {
  const [slug,   setSlug]   = useState<Slug>("about");
  const [locale, setLocale] = useState<Locale>("fr");
  const [data,   setData]   = useState<PageContentData>(EMPTY);
  const [saved,  setSaved]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Fetch when slug or locale changes ──────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/next-api/content/${slug}/${locale}`);
      if (res.ok) {
        const raw = (await res.json())?.data;
        setData({
          title:    raw?.title    ?? "",
          intro:    raw?.intro    ?? "",
          sections: Array.isArray(raw?.sections) ? raw.sections : [],
          stats:    Array.isArray(raw?.stats)    ? raw.stats    : [],
        });
      } else {
        setData(EMPTY);
      }
    } catch {
      setError("Could not load content.");
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [slug, locale]);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setField = (field: keyof Omit<PageContentData, "sections">, val: string) =>
    setData(d => ({ ...d, [field]: val }));

  const addSection = () =>
    setData(d => ({ ...d, sections: [...d.sections, { title: "", body: "" }] }));

  const removeSection = (i: number) =>
    setData(d => ({ ...d, sections: d.sections.filter((_, idx) => idx !== i) }));

  const setSectionTitle = (i: number, val: string) =>
    setData(d => ({
      ...d,
      sections: d.sections.map((s, idx) => idx === i ? { ...s, title: val } : s),
    }));

  const setSectionBody = (i: number, val: string) =>
    setData(d => ({
      ...d,
      sections: d.sections.map((s, idx) => idx === i ? { ...s, body: val } : s),
    }));

  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    setData(d => {
      const sections = [...d.sections];
      [sections[i], sections[j]] = [sections[j], sections[i]];
      return { ...d, sections };
    });
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/next-api/content/${slug}/${locale}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json?.message ?? "Save failed.");
      }
    } catch {
      setError("Could not save content.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.editor}>

      {/* ── Page tabs ── */}
      <div className={styles.pageTabs}>
        {PAGES.map(p => (
          <button
            key={p.slug}
            type="button"
            className={`${styles.pageTab} ${slug === p.slug ? styles.pageTabActive : ""}`}
            onClick={() => setSlug(p.slug)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Locale switcher ── */}
      <div className={styles.localeBar}>
        {(["fr", "en"] as Locale[]).map(l => (
          <button
            key={l}
            type="button"
            className={`${styles.localeBtn} ${locale === l ? styles.localeBtnActive : ""}`}
            onClick={() => setLocale(l)}
          >
            {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
          </button>
        ))}
        <span className={styles.localeNote}>
          Content overrides translations when saved
        </span>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className={styles.loadingRow}>Loading…</div>
      ) : (
        <div className={styles.fields}>

          <label className={styles.fieldLabel}>
            Page title
            <input
              className={styles.fieldInput}
              value={data.title}
              onChange={e => setField("title", e.target.value)}
              placeholder="Page title"
            />
          </label>

          <label className={styles.fieldLabel}>
            Intro / summary
            <textarea
              className={styles.fieldTextarea}
              value={data.intro}
              onChange={e => setField("intro", e.target.value)}
              placeholder="Short introduction shown below the title"
              rows={3}
            />
          </label>

          {/* ── Stats (About page only) ── */}
          {slug === "about" && (
            <div className={styles.statsBlock}>
              <div className={styles.sectionsHeader}>
                <span className={styles.sectionsTitle}>Key stats</span>
                <span className={styles.localeNote}>Displayed below the hero</span>
              </div>
              {(data.stats?.length ? data.stats : DEFAULT_STATS).map((stat, i) => (
                <div key={i} className={styles.statRow}>
                  <span className={styles.sectionIndex}>#{i + 1}</span>
                  <input
                    className={styles.statInput}
                    value={stat.num}
                    onChange={e => setData(d => {
                      const stats = (d.stats?.length ? [...d.stats] : [...DEFAULT_STATS]);
                      stats[i] = { ...stats[i], num: e.target.value };
                      return { ...d, stats };
                    })}
                    placeholder="e.g. 500+"
                  />
                  <input
                    className={styles.statInput}
                    value={stat.label}
                    onChange={e => setData(d => {
                      const stats = (d.stats?.length ? [...d.stats] : [...DEFAULT_STATS]);
                      stats[i] = { ...stats[i], label: e.target.value };
                      return { ...d, stats };
                    })}
                    placeholder="e.g. Véhicules livrés"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Sections ── */}
          <div className={styles.sectionsHeader}>
            <span className={styles.sectionsTitle}>Sections</span>
            <button type="button" className={styles.addSectionBtn} onClick={addSection}>
              + Add section
            </button>
          </div>

          {(data.sections ?? []).map((sec, i) => (
            <div key={i} className={styles.sectionCard}>
              <div className={styles.sectionCardHeader}>
                <span className={styles.sectionIndex}>#{i + 1}</span>
                <input
                  className={styles.sectionTitleInput}
                  value={sec.title}
                  onChange={e => setSectionTitle(i, e.target.value)}
                  placeholder="Section title"
                />
                <div className={styles.sectionActions}>
                  <button
                    type="button"
                    className={styles.sectionMoveBtn}
                    disabled={i === 0}
                    onClick={() => moveSection(i, -1)}
                    title="Move up"
                  ><ChevronUp size={14} strokeWidth={1.75} /></button>
                  <button
                    type="button"
                    className={styles.sectionMoveBtn}
                    disabled={i === data.sections.length - 1}
                    onClick={() => moveSection(i, 1)}
                    title="Move down"
                  ><ChevronDown size={14} strokeWidth={1.75} /></button>
                  <button
                    type="button"
                    className={styles.sectionRemoveBtn}
                    onClick={() => removeSection(i)}
                    title="Remove section"
                  ><X size={14} strokeWidth={2} /></button>
                </div>
              </div>
              <RichTextEditor
                key={`${slug}-${locale}-${i}`}
                content={sec.body}
                onChange={html => setSectionBody(i, html)}
              />
            </div>
          ))}

          {(data.sections ?? []).length === 0 && (
            <p className={styles.emptySections}>
              No sections yet. Click "Add section" to start.
            </p>
          )}

        </div>
      )}

      {/* ── Footer bar ── */}
      <div className={styles.footerBar}>
        {error && <span className={styles.errorMsg}>{error}</span>}
        {saved && <span className={styles.savedMsg}>Saved and cache revalidated ✓</span>}
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving…" : "Save & publish"}
        </button>
      </div>

    </div>
  );
}

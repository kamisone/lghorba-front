"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";
import { OVERLAY_LANGS, type OverlayLang } from "@/hooks/useEntityTranslations";
import styles from "./BilingualField.module.css";

// TipTap/ProseMirror needs browser globals — load client-side only.
const RichTextEditor = dynamic(() => import("./content/RichTextEditor"), { ssr: false });

const LANG_LABEL: Record<OverlayLang, string> = {
  en: "English", es: "Español", it: "Italiano", de: "Deutsch", nl: "Nederlands", pl: "Polski",
};
const LANG_FLAG: Record<OverlayLang, string> = {
  en: "🇬🇧", es: "🇪🇸", it: "🇮🇹", de: "🇩🇪", nl: "🇳🇱", pl: "🇵🇱",
};

interface LangRowProps {
  lang: "fr" | OverlayLang;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  richText?: boolean;
  maxLength?: number;
}

function LangRow({ lang, value, onChange, placeholder, multiline, rows = 2, required = false, richText = false, maxLength }: LangRowProps) {
  const label = lang === "fr" ? "Français" : LANG_LABEL[lang];
  const flag = lang === "fr" ? "🇫🇷" : LANG_FLAG[lang];
  const badge = required
    ? { text: lang === "fr" ? "Requis" : "Required", cls: styles.badgeRequired }
    : { text: lang === "fr" ? "Optionnel" : "Optional", cls: styles.badgeOptional };
  return (
    <div className={`${styles.langRow} ${lang === "fr" ? styles.fr : styles.overlay}`}>
      <div className={styles.langAccent} />
      <div className={styles.langBody}>
        <div className={styles.langMeta}>
          <span className={styles.langFlag}>{flag}</span>
          <span className={styles.langName}>{label}</span>
          <span className={`${styles.langBadge} ${badge.cls}`}>{badge.text}</span>
        </div>
        {richText ? (
          <RichTextEditor content={value} onChange={onChange} />
        ) : multiline ? (
          <textarea
            className={styles.langInput}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            required={required}
            maxLength={maxLength}
          />
        ) : (
          <input
            className={styles.langInput}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
          />
        )}
      </div>
    </div>
  );
}

interface BilingualFieldProps {
  label: string;
  /** Key into the translations record (e.g. "title", "description") */
  field: string;
  frValue: string;
  frOnChange: (val: string) => void;
  frPlaceholder?: string;
  /** Overlay-language values, keyed by lang then field — pass the hook's `translations` as-is */
  translations: Record<OverlayLang, Record<string, string>>;
  /** Call with (lang, field, value) when an overlay-language input changes — pass the hook's `setTranslation` as-is */
  onTranslationChange: (lang: OverlayLang, field: string, value: string) => void;
  overlayPlaceholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  /** Mark the FR input as required (overlay languages are always optional) */
  frRequired?: boolean;
  /** Render a rich text (HTML) editor instead of a plain textarea */
  richText?: boolean;
  /** Collapse the FR/overlay inputs behind a clickable label */
  collapsible?: boolean;
  /** When collapsible, whether the field starts expanded */
  defaultOpen?: boolean;
}

export default function BilingualField({
  label,
  field,
  frValue, frOnChange, frPlaceholder,
  translations, onTranslationChange,
  overlayPlaceholder,
  multiline = false,
  rows = 2,
  maxLength,
  frRequired = false,
  richText = false,
  collapsible = false,
  defaultOpen = false,
}: BilingualFieldProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeLang, setActiveLang] = useState<OverlayLang>("en");
  const isOpen = !collapsible || open;

  const labelContent = (
    <span className={styles.bilingualLabel}>
      {label}
      {frRequired && <span className={styles.requiredStar}> *</span>}
    </span>
  );

  return (
    <div className={styles.bilingualField}>
      {collapsible ? (
        <button
          type="button"
          className={styles.bilingualLabelToggle}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          {labelContent}
          <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
        </button>
      ) : (
        labelContent
      )}
      {isOpen && (
        <div className={`${styles.bilingualCard} ${richText ? styles.bilingualCardRichText : ""}`}>
          <LangRow
            lang="fr"
            value={frValue}
            onChange={frOnChange}
            placeholder={frPlaceholder}
            multiline={multiline}
            rows={rows}
            required={frRequired}
            richText={richText}
            maxLength={maxLength}
          />
          <div className={styles.langSep} />
          <div className={styles.overlayColumn}>
            <div className={styles.overlayTabs} role="tablist">
              {OVERLAY_LANGS.map(l => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={activeLang === l}
                  className={`${styles.overlayTab} ${activeLang === l ? styles.overlayTabActive : ""}`}
                  onClick={() => setActiveLang(l)}
                  title={LANG_LABEL[l]}
                >
                  <span className={styles.overlayTabFlag}>{LANG_FLAG[l]}</span>
                  {l.toUpperCase()}
                  {translations[l]?.[field]?.trim() && <span className={styles.overlayTabDot} />}
                </button>
              ))}
            </div>
            <LangRow
              lang={activeLang}
              value={translations[activeLang]?.[field] ?? ""}
              onChange={(v) => onTranslationChange(activeLang, field, v)}
              placeholder={overlayPlaceholder}
              multiline={multiline}
              rows={rows}
              required={false}
              richText={richText}
              maxLength={maxLength}
            />
          </div>
        </div>
      )}
    </div>
  );
}

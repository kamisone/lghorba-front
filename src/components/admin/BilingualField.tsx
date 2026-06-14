"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";
import styles from "./BilingualField.module.css";

// TipTap/ProseMirror needs browser globals — load client-side only.
const RichTextEditor = dynamic(() => import("./content/RichTextEditor"), { ssr: false });

interface LangRowProps {
  lang: "fr" | "en";
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  richText?: boolean;
}

const LANG_LABEL = { fr: "Français", en: "English" } as const;
const LANG_FLAG  = { fr: "🇫🇷",      en: "🇬🇧"     } as const;

function LangRow({ lang, value, onChange, placeholder, multiline, rows = 2, required = false, richText = false }: LangRowProps) {
  const badge = required
    ? { text: lang === "fr" ? "Requis" : "Required", cls: styles.badgeRequired }
    : { text: lang === "fr" ? "Optionnel" : "Optional", cls: styles.badgeOptional };
  return (
    <div className={`${styles.langRow} ${styles[lang]}`}>
      <div className={styles.langAccent} />
      <div className={styles.langBody}>
        <div className={styles.langMeta}>
          <span className={styles.langFlag}>{LANG_FLAG[lang]}</span>
          <span className={styles.langName}>{LANG_LABEL[lang]}</span>
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
          />
        ) : (
          <input
            className={styles.langInput}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
          />
        )}
      </div>
    </div>
  );
}

interface BilingualFieldProps {
  label: string;
  frValue: string;
  frOnChange: (val: string) => void;
  frPlaceholder?: string;
  enValue: string;
  enOnChange: (val: string) => void;
  enPlaceholder?: string;
  multiline?: boolean;
  rows?: number;
  /** Mark the FR input as required (EN is always optional) */
  frRequired?: boolean;
  /** Render a rich text (HTML) editor instead of a plain textarea */
  richText?: boolean;
  /** Collapse the FR/EN inputs behind a clickable label */
  collapsible?: boolean;
  /** When collapsible, whether the field starts expanded */
  defaultOpen?: boolean;
}

export default function BilingualField({
  label,
  frValue, frOnChange, frPlaceholder,
  enValue, enOnChange, enPlaceholder,
  multiline = false,
  rows = 2,
  frRequired = false,
  richText = false,
  collapsible = false,
  defaultOpen = false,
}: BilingualFieldProps) {
  const [open, setOpen] = useState(defaultOpen);
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
          />
          <div className={styles.langSep} />
          <LangRow
            lang="en"
            value={enValue}
            onChange={enOnChange}
            placeholder={enPlaceholder}
            multiline={multiline}
            rows={rows}
            required={false}
            richText={richText}
          />
        </div>
      )}
    </div>
  );
}

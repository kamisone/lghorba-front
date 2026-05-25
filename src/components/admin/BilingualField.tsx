"use client";

import styles from "./BilingualField.module.css";

interface LangRowProps {
  lang: "fr" | "en";
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
}

const LANG_LABEL = { fr: "Français", en: "English" } as const;
const LANG_FLAG  = { fr: "🇫🇷",      en: "🇬🇧"     } as const;

function LangRow({ lang, value, onChange, placeholder, multiline, rows = 2, required = false }: LangRowProps) {
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
        {multiline ? (
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
}

export default function BilingualField({
  label,
  frValue, frOnChange, frPlaceholder,
  enValue, enOnChange, enPlaceholder,
  multiline = false,
  rows = 2,
  frRequired = false,
}: BilingualFieldProps) {
  return (
    <div className={styles.bilingualField}>
      <span className={styles.bilingualLabel}>
        {label}
        {frRequired && <span className={styles.requiredStar}> *</span>}
      </span>
      <div className={styles.bilingualCard}>
        <LangRow
          lang="fr"
          value={frValue}
          onChange={frOnChange}
          placeholder={frPlaceholder}
          multiline={multiline}
          rows={rows}
          required={frRequired}
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
        />
      </div>
    </div>
  );
}

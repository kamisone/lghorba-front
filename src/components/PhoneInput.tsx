"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import styles from "./PhoneInput.module.css";

// ── Country data ──────────────────────────────────────────────────────────────

interface Country {
  code: string;
  dial: string;
  flag: string;
}

// France first, then alphabetical — curated for a French rental platform.
const COUNTRIES: Country[] = [
  { code: "FR", dial: "+33",  flag: "🇫🇷" },
  { code: "DZ", dial: "+213", flag: "🇩🇿" },
  { code: "AU", dial: "+61",  flag: "🇦🇺" },
  { code: "BE", dial: "+32",  flag: "🇧🇪" },
  { code: "CA", dial: "+1",   flag: "🇨🇦" },
  { code: "CM", dial: "+237", flag: "🇨🇲" },
  { code: "CI", dial: "+225", flag: "🇨🇮" },
  { code: "DE", dial: "+49",  flag: "🇩🇪" },
  { code: "ES", dial: "+34",  flag: "🇪🇸" },
  { code: "GB", dial: "+44",  flag: "🇬🇧" },
  { code: "IT", dial: "+39",  flag: "🇮🇹" },
  { code: "LU", dial: "+352", flag: "🇱🇺" },
  { code: "MA", dial: "+212", flag: "🇲🇦" },
  { code: "MC", dial: "+377", flag: "🇲🇨" },
  { code: "NL", dial: "+31",  flag: "🇳🇱" },
  { code: "PT", dial: "+351", flag: "🇵🇹" },
  { code: "SN", dial: "+221", flag: "🇸🇳" },
  { code: "CH", dial: "+41",  flag: "🇨🇭" },
  { code: "TN", dial: "+216", flag: "🇹🇳" },
  { code: "US", dial: "+1",   flag: "🇺🇸" },
];

const DEFAULT: Country = COUNTRIES[0]; // France

function getCountryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  value: string;                      // full intl number (+33612345678) or ""
  onChange: (v: string) => void;      // emits full number or "" when empty
  onBlur?: () => void;               // fires when focus leaves the whole widget
  error?: boolean;
  placeholder?: string;
  id?: string;
  locale?: string;
  searchPlaceholder?: string;
  noCountriesLabel?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PhoneInput({
  value,
  onChange,
  onBlur,
  error,
  placeholder = "6 12 34 56 78",
  id,
  locale = "en",
  searchPlaceholder = "Search…",
  noCountriesLabel = "No countries found",
}: Props) {
  const [country, setCountry] = useState<Country>(DEFAULT);
  const [number,  setNumber]  = useState("");
  const [open,    setOpen]    = useState(false);
  const [search,  setSearch]  = useState("");

  const rootRef   = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset internal state when value is cleared externally
  useEffect(() => {
    if (!value) setNumber("");
  }, [value]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30);
    else setSearch("");
  }, [open]);

  // ── Emit ────────────────────────────────────────────────────────────────────

  function emit(c: Country, n: string) {
    const digits = n.replace(/\D/g, "");
    onChange(digits ? `${c.dial}${digits}` : "");
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function selectCountry(c: Country) {
    setCountry(c);
    setOpen(false);
    emit(c, number);
    setTimeout(() => inputRef.current?.focus(), 20);
  }

  function handleNumberChange(raw: string) {
    // Allow digits, spaces, hyphens, parentheses
    const cleaned = raw.replace(/[^\d\s\-()]/g, "");
    setNumber(cleaned);
    emit(country, cleaned);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  // ── Filtered list ────────────────────────────────────────────────────────────

  const q = search.toLowerCase().trim();
  const filtered = q
    ? COUNTRIES.filter(c => {
        const name = getCountryName(c.code, locale).toLowerCase();
        return name.includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q);
      })
    : COUNTRIES;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={styles.root}
      ref={rootRef}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) {
          onBlur?.();
        }
      }}
    >
      {/* Unified input row */}
      <div className={`${styles.inputRow} ${error ? styles.inputRowError : ""}`}>

        {/* Country selector trigger */}
        <button
          type="button"
          className={`${styles.countryBtn} ${open ? styles.countryBtnOpen : ""}`}
          onClick={() => setOpen(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code: ${getCountryName(country.code, locale)} ${country.dial}`}
          tabIndex={0}
        >
          <span className={styles.flag}    aria-hidden="true">{country.flag}</span>
          <span className={styles.dialCode}>{country.dial}</span>
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            className={`${styles.caret} ${open ? styles.caretOpen : ""}`}
            aria-hidden="true"
          />
        </button>

        {/* Vertical rule */}
        <span className={styles.rule} aria-hidden="true" />

        {/* National number input */}
        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="numeric"
          className={styles.numberInput}
          placeholder={placeholder}
          value={number}
          autoComplete="tel-national"
          aria-label="Phone number"
          onChange={e => handleNumberChange(e.target.value)}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className={styles.dropdown} role="listbox" aria-label="Select country">

          {/* Search */}
          <div className={styles.searchRow}>
            <Search size={14} strokeWidth={1.75} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search countries"
            />
          </div>

          {/* Country list */}
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <p className={styles.noResults}>{noCountriesLabel}</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  aria-selected={c.code === country.code}
                  className={`${styles.option} ${c.code === country.code ? styles.optionActive : ""}`}
                  onClick={() => selectCountry(c)}
                >
                  <span className={styles.optionFlag} aria-hidden="true">{c.flag}</span>
                  <span className={styles.optionName}>{getCountryName(c.code, locale)}</span>
                  <span className={styles.optionDial}>{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

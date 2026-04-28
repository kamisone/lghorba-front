"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PhoneInput.module.css";

// ── Country data ──────────────────────────────────────────────────────────────

interface Country {
  code: string;
  dial: string;
  name: string;
  flag: string;
}

// France first, then alphabetical — curated for a French rental platform.
const COUNTRIES: Country[] = [
  { code: "FR", dial: "+33",  flag: "🇫🇷", name: "France"           },
  { code: "DZ", dial: "+213", flag: "🇩🇿", name: "Algeria"          },
  { code: "AU", dial: "+61",  flag: "🇦🇺", name: "Australia"        },
  { code: "BE", dial: "+32",  flag: "🇧🇪", name: "Belgium"          },
  { code: "CA", dial: "+1",   flag: "🇨🇦", name: "Canada"           },
  { code: "CM", dial: "+237", flag: "🇨🇲", name: "Cameroon"         },
  { code: "CI", dial: "+225", flag: "🇨🇮", name: "Côte d'Ivoire"    },
  { code: "DE", dial: "+49",  flag: "🇩🇪", name: "Germany"          },
  { code: "ES", dial: "+34",  flag: "🇪🇸", name: "Spain"            },
  { code: "GB", dial: "+44",  flag: "🇬🇧", name: "United Kingdom"   },
  { code: "IT", dial: "+39",  flag: "🇮🇹", name: "Italy"            },
  { code: "LU", dial: "+352", flag: "🇱🇺", name: "Luxembourg"       },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "Morocco"          },
  { code: "MC", dial: "+377", flag: "🇲🇨", name: "Monaco"           },
  { code: "NL", dial: "+31",  flag: "🇳🇱", name: "Netherlands"      },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal"         },
  { code: "SN", dial: "+221", flag: "🇸🇳", name: "Senegal"          },
  { code: "CH", dial: "+41",  flag: "🇨🇭", name: "Switzerland"      },
  { code: "TN", dial: "+216", flag: "🇹🇳", name: "Tunisia"          },
  { code: "US", dial: "+1",   flag: "🇺🇸", name: "United States"    },
];

const DEFAULT: Country = COUNTRIES[0]; // France

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  value: string;                      // full intl number (+33612345678) or ""
  onChange: (v: string) => void;      // emits full number or "" when empty
  onBlur?: () => void;               // fires when focus leaves the whole widget
  error?: boolean;
  placeholder?: string;
  id?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PhoneInput({
  value,
  onChange,
  onBlur,
  error,
  placeholder = "6 12 34 56 78",
  id,
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
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
      )
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
          aria-label={`Country code: ${country.name} ${country.dial}`}
          tabIndex={0}
        >
          <span className={styles.flag}    aria-hidden="true">{country.flag}</span>
          <span className={styles.dialCode}>{country.dial}</span>
          <span
            className={`material-symbols-outlined ${styles.caret} ${open ? styles.caretOpen : ""}`}
            aria-hidden="true"
          >
            expand_more
          </span>
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
            <span className={`material-symbols-outlined ${styles.searchIcon}`} aria-hidden="true">
              search
            </span>
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search countries"
            />
          </div>

          {/* Country list */}
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <p className={styles.noResults}>No countries found</p>
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
                  <span className={styles.optionName}>{c.name}</span>
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

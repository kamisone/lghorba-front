"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AddressAutocomplete.module.css";

export interface SelectedAddress {
  label: string;
  lat:   number;
  lng:   number;
  city?: string;
}

interface Suggestion {
  label: string;
  lat:   number;
  lng:   number;
  score: number;
  city:  string;
  postcode: string;
}

interface Props {
  value:         SelectedAddress | null;
  onChange:      (addr: SelectedAddress | null) => void;
  placeholder?:  string;
  required?:     boolean;
  id?:           string;
  error?:        string;
}

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Rechercher une adresse en France…",
  required = false,
  id,
  error,
}: Props) {
  const [query, setQuery]             = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync with external value clear
  useEffect(() => {
    if (!value) setQuery("");
    else if (value.label !== query) setQuery(value.label);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const fetchSuggestions = async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${BAN_URL}?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`,
      );
      const data = await res.json();
      const items: Suggestion[] = (data.features ?? []).map((f: {
        geometry: { coordinates: [number, number] };
        properties: { label: string; score: number; city: string; postcode: string };
      }) => ({
        label:    f.properties.label,
        lat:      f.geometry.coordinates[1],
        lng:      f.geometry.coordinates[0],
        score:    f.properties.score,
        city:     f.properties.city,
        postcode: f.properties.postcode,
      }));
      setSuggestions(items);
      setOpen(items.length > 0);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // If user edits after selecting → invalidate selection
    if (value && val !== value.label) onChange(null);
    // Debounced fetch
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  };

  const select = (s: Suggestion) => {
    setQuery(s.label);
    setSuggestions([]);
    setOpen(false);
    onChange({ label: s.label, lat: s.lat, lng: s.lng, city: s.city });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion to fire first
    setTimeout(() => {
      setOpen(false);
      // If query doesn't match a selected address, clear
      if (!value || query !== value.label) {
        onChange(null);
        setQuery("");
      }
    }, 150);
  };

  return (
    <div className={styles.wrap}>
      <div className={`${styles.inputWrap} ${error ? styles.inputError : ""} ${value ? styles.inputValid : ""}`}>
        <span className={styles.inputIcon}>📍</span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={styles.input}
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          required={required && !value}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-activedescendant={activeIdx >= 0 ? `addr-opt-${activeIdx}` : undefined}
        />
        {loading && <span className={styles.spinner} />}
        {value && !loading && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => { onChange(null); setQuery(""); inputRef.current?.focus(); }}
            aria-label="Clear address"
          >
            ✕
          </button>
        )}
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {open && suggestions.length > 0 && (
        <ul ref={listRef} className={styles.dropdown} role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat},${s.lng}`}
              id={`addr-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              className={`${styles.option} ${i === activeIdx ? styles.optionActive : ""}`}
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
            >
              <span className={styles.optionIcon}>📍</span>
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{s.label}</span>
                <span className={styles.optionCity}>{s.city} {s.postcode}</span>
              </span>
            </li>
          ))}
          <li className={styles.powered}>
            <span>Données: Base Adresse Nationale</span>
          </li>
        </ul>
      )}
    </div>
  );
}

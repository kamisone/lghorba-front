"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import styles from "./SearchAutocomplete.module.css";

interface Suggestion {
  id: string;
  slug: string;
  title: string;
}

interface Props {
  locale: string;
  placeholder?: string;
  variant?: "default" | "hero" | "header";
  initialValue?: string;
}

export default function SearchAutocomplete({ locale, placeholder = "Search products…", variant = "default", initialValue = "" }: Props) {
  const t      = getTranslations(locale);
  const router = useRouter();
  const [query, setQuery]             = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen]               = useState(false);
  const [active, setActive]           = useState(-1);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout>>();
  const inputRef                      = useRef<HTMLInputElement>(null);
  const containerRef                  = useRef<HTMLDivElement>(null);
  const isHero                        = variant === "hero";
  const isHeader                      = variant === "header";

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/next-api/public/shop/search/autocomplete?q=${encodeURIComponent(query)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
          setOpen(true);
          setActive(-1);
        }
      } catch { /* silent */ }
    }, 180);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function navigate(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/${locale}/shop/${slug}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) {
      navigate(suggestions[active].slug);
    } else if (query.trim()) {
      setOpen(false);
      router.push(`/${locale}/shop/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setActive(a => Math.max(a - 1, -1)); }
    if (e.key === "Escape")     { setOpen(false); setActive(-1); }
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <form onSubmit={submit} className={isHero ? styles.formHero : isHeader ? styles.formHeader : styles.form}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={isHero ? styles.inputHero : isHeader ? styles.inputHeader : styles.input}
        />
        <button type="submit" className={isHero ? styles.btnHero : isHeader ? styles.btnHeader : styles.btn} aria-label={t.blog.searchBtn}>
          {isHeader ? <Search size={16} strokeWidth={2.25} aria-hidden="true" /> : t.blog.searchBtn}
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <div className={styles.dropdown}>
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              onMouseDown={() => navigate(s.slug)}
              className={`${styles.suggestionBtn} ${i === active ? styles.suggestionBtnActive : ""}`}
            >
              {s.title}
            </button>
          ))}
          <a
            href={`/${locale}/shop/search?q=${encodeURIComponent(query)}`}
            className={styles.seeAllLink}
          >
            {t.shop.seeAllResultsFor} &ldquo;{query}&rdquo;
          </a>
        </div>
      )}
    </div>
  );
}

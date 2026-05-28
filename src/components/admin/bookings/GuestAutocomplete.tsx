"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./GuestAutocomplete.module.css";
import { X } from "lucide-react";

export interface GuestUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rentCount?: number;
  score?: number;
  turoJoinDate?: string;
  getaroundJoinDate?: string;
}

interface Props {
  value: string;
  onChange: (name: string) => void;
  onSelect: (user: GuestUser | null) => void;
  selectedUser: GuestUser | null;
  placeholder?: string;
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 8 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <span className={styles.scoreDot} style={{ background: color }} title={`Score: ${score}/10`}>
      {score}
    </span>
  );
}

export default function GuestAutocomplete({ value, onChange, onSelect, selectedUser, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<GuestUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (selectedUser) return;
    if (!value.trim() || value.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/next-api/users?search=${encodeURIComponent(value.trim())}&limit=6`);
        if (res.ok) {
          const data: GuestUser[] = await res.json();
          setSuggestions(data);
          setOpen(data.length > 0);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [value, selectedUser]);

  const handleSelect = (user: GuestUser) => {
    onSelect(user);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div className={styles.wrap} ref={ref}>
      {selectedUser ? (
        <div className={styles.selected}>
          <div className={styles.selectedInfo}>
            <span className={styles.selectedName}>{selectedUser.name}</span>
            {selectedUser.phone && <span className={styles.selectedPhone}>{selectedUser.phone}</span>}
            {selectedUser.rentCount != null && selectedUser.rentCount > 0 && (
              <span className={styles.rentBadge}>{selectedUser.rentCount} rent{selectedUser.rentCount > 1 ? "s" : ""}</span>
            )}
            {selectedUser.score != null && <ScoreDot score={selectedUser.score} />}
          </div>
          <button type="button" className={styles.clearBtn} onClick={() => onSelect(null)} title="Change guest"><X size={14} strokeWidth={2} /></button>
        </div>
      ) : (
        <div className={styles.inputWrap}>
          <input
            type="text"
            className={styles.input}
            placeholder={placeholder ?? "Search by name or phone…"}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            autoComplete="off"
          />
          {loading && <span className={styles.spinner} />}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <ul className={styles.dropdown}>
          {suggestions.map(u => (
            <li key={u.id}>
              <button type="button" className={styles.option} onClick={() => handleSelect(u)}>
                <div className={styles.optionTop}>
                  <span className={styles.optionName}>{u.name}</span>
                  {u.score != null && <ScoreDot score={u.score} />}
                </div>
                <span className={styles.optionMeta}>
                  {u.phone}
                  {u.rentCount != null && u.rentCount > 0 && (
                    <span className={styles.optionRentCount}> · {u.rentCount} rent{u.rentCount > 1 ? "s" : ""}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
          <li className={styles.hint}>Not listed? Just type the name — a new user will be created.</li>
        </ul>
      )}
    </div>
  );
}

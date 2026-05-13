"use client";

import { useEffect, useState } from "react";

export interface ErrorEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
  context?: string;
  level: "error" | "warning";
}

const MAX = 50;
const store: ErrorEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(cb => cb());
}

export function reportError(
  error: unknown,
  meta?: { url?: string; context?: string; level?: "error" | "warning" },
): void {
  const entry: ErrorEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: meta?.url ?? (typeof window !== "undefined" ? window.location.href : undefined),
    context: meta?.context,
    level: meta?.level ?? "error",
  };

  store.unshift(entry);
  if (store.length > MAX) store.splice(MAX);
  notify();

  fetch("/next-api/error-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

export function getErrors(): ErrorEntry[] {
  return [...store];
}

export function clearErrors(): void {
  store.splice(0);
  notify();
}

export function dismissError(id: string): void {
  const idx = store.findIndex(e => e.id === id);
  if (idx !== -1) {
    store.splice(idx, 1);
    notify();
  }
}

export function subscribeErrors(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useErrorStore() {
  const [errors, setErrors] = useState<ErrorEntry[]>(() => getErrors());

  useEffect(() => {
    setErrors(getErrors());
    return subscribeErrors(() => setErrors(getErrors()));
  }, []);

  return { errors, clear: clearErrors, dismiss: dismissError };
}

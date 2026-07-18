"use client";

import { useCallback, useEffect, useState } from "react";

interface Translation {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  lang: string;
  value: string;
}

interface UseEntityTranslationsReturn {
  enValues: Record<string, string>;
  enIds: Record<string, string>;   // field → translation row ID (for deletion)
  setEn: (field: string, value: string) => void;
  loadingEn: boolean;
  saveEnTranslations: (entityId: string, fields: string[]) => Promise<void>;
}

export function useEntityTranslations(
  entityType: string,
  entityId: string | null,
): UseEntityTranslationsReturn {
  const [enValues, setEnValues] = useState<Record<string, string>>({});
  const [enIds,    setEnIds]    = useState<Record<string, string>>({});
  const [loadingEn, setLoadingEn] = useState(false);

  useEffect(() => {
    if (!entityId) {
      // No entity to load translations for (e.g. a "create new" form) — clear
      // any leftover values from a previously-edited entity instead of leaving
      // them stale in the EN fields.
      setEnValues({});
      setEnIds({});
      return;
    }
    setLoadingEn(true);
    fetch(`/next-api/translations/${entityType}/${entityId}?lang=en`)
      .then(r => r.ok ? r.json() as Promise<Translation[]> : [])
      .then(rows => {
        const vals: Record<string, string> = {};
        const ids:  Record<string, string> = {};
        for (const row of rows) {
          if (row.lang === 'en') {
            vals[row.field] = row.value;
            ids[row.field]  = row.id;
          }
        }
        setEnValues(vals);
        setEnIds(ids);
      })
      .catch(() => {})
      .finally(() => setLoadingEn(false));
  }, [entityType, entityId]);

  const setEn = useCallback((field: string, value: string) => {
    setEnValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveEnTranslations = useCallback(async (id: string, fields: string[]) => {
    const toUpsert = fields
      .filter(f => enValues[f]?.trim())
      .map(f => ({ entityType, entityId: id, field: f, lang: 'en', value: enValues[f].trim() }));

    const toDelete = fields.filter(f => !enValues[f]?.trim() && enIds[f]);

    await Promise.all([
      toUpsert.length > 0
        ? fetch('/next-api/translations/bulk', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: toUpsert }),
          })
        : Promise.resolve(),
      ...toDelete.map(f =>
        fetch(`/next-api/translations/entry/${enIds[f]}`, { method: 'DELETE' }),
      ),
    ]);
  }, [entityType, enValues, enIds]);

  return { enValues, enIds, setEn, loadingEn, saveEnTranslations };
}

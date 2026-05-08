export const LS_KEY = "car_search_context";
export const LS_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SearchAddress {
  lat: number;
  lng: number;
  label: string;
}

export interface SearchContext {
  start: string;
  end: string;
  savedAt: number;
  address?: SearchAddress;
}

export function loadSearchContext(): SearchContext | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SearchContext>;
    if (!parsed.start || !parsed.end || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > LS_TTL) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return {
      start: parsed.start,
      end: parsed.end,
      savedAt: parsed.savedAt,
      address: parsed.address,
    };
  } catch {
    return null;
  }
}

export function saveSearchContext(start: string, end: string, address?: SearchAddress): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ start, end, savedAt: Date.now(), address }));
  } catch { /* ignore */ }
}

export function clearSearchContext(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}

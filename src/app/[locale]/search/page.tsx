import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import styles from "./search.module.css";
import SearchClient from "./SearchClient";

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

interface SearchResult {
  id:               string;
  name:             string;
  description:      string | null;
  hasPhoto:         boolean;
  brand:            string | null;
  model:            string | null;
  finishing:        string | null;
  modelYear:        number | null;
  vehicleType:      string | null;
  energy:           string | null;
  gearbox:          string | null;
  numberOfSeats:    number | null;
  basePricePerDay:  number | null;
  parkingAddress:   string | null;
  deliveryEnabled:      boolean;
  deliveryType:         string | null;
  deliveryRadiusKm:     number | null;
  deliveryRadiusPrice:  number | null;
  distanceKm:           number | null;
  deliveryAvailable:    boolean;
}

async function searchCars(params: {
  start: string; end: string; lat: string; lng: string; address: string; locale: string;
}): Promise<SearchResult[]> {
  const { start, end, lat, lng, address, locale } = params;
  if (!start || !end) return [];

  const body: Record<string, unknown> = { startDateTime: start, endDateTime: end, lang: locale };
  if (lat && lng && address) {
    body.addressLat   = parseFloat(lat);
    body.addressLng   = parseFloat(lng);
    body.addressLabel = address;
  }

  try {
    const res = await fetch(`${API}/public/cars/search`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      cache:   "no-store",
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = getTranslations(params.locale);
  return {
    title: `${t.search.resultsTitle} — Vitecamion`,
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { start?: string; end?: string; lat?: string; lng?: string; address?: string };
}) {
  const locale  = params.locale;
  const start   = searchParams.start   ?? "";
  const end     = searchParams.end     ?? "";
  const lat     = searchParams.lat     ?? "";
  const lng     = searchParams.lng     ?? "";
  const address = searchParams.address ?? "";
  const results = await searchCars({ start, end, lat, lng, address, locale });

  return (
    <div className={styles.page}>

      {/* ── Sticky refinement panel + results — all client state ── */}
      <SearchClient
        initialResults={results}
        initialStart={start}
        initialEnd={end}
        initialLat={lat}
        initialLng={lng}
        initialAddress={address}
        locale={locale}
      />

    </div>
  );
}

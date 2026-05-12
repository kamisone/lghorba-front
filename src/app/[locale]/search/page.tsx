import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import styles from "./search.module.css";
import BackButton from "./BackButton";
import SearchResults from "./SearchResults";

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
    return res.ok ? res.json() : [];
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
  const t       = getTranslations(locale);
  const hasAddress = Boolean(address && lat && lng);

  const results = await searchCars({ start, end, lat, lng, address, locale });

  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium", timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  const startFmt = start ? fmt.format(new Date(start)) : "";
  const endFmt   = end   ? fmt.format(new Date(end))   : "";

  return (
    <div className={styles.page}>

      {/* ── Header — server-rendered ── */}
      <div className={styles.header}>
        <div className={styles.headerBg} aria-hidden="true">
          <div className={styles.headerBgGlow} />
          <div className={styles.headerBgGrid} />
        </div>
        <div className={styles.headerContent}>
          <BackButton label={t.search.backToSearch} />
          <h1 className={styles.headerTitle}>{t.search.resultsTitle}</h1>
          <div className={styles.headerMeta}>
            <span className={styles.headerMetaItem}>📅 {startFmt} → {endFmt}</span>
            {address && (
              <>
                <span className={styles.headerMetaSep}>·</span>
                <span className={styles.headerMetaItem}>📍 {address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Results — client island handles sort + prices ── */}
      <SearchResults
        results={results}
        start={start}
        end={end}
        locale={locale}
        hasAddress={hasAddress}
        lat={lat}
        lng={lng}
        address={address}
      />

    </div>
  );
}

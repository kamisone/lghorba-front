import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import styles from "./fleet.module.css";
import FleetGrid, { type FleetCar } from "./FleetGrid";
import CarCard from "./CarCard";

// Data is cached indefinitely via force-cache + tags.
// Invalidated explicitly via revalidateTag("cars") / revalidateTag(`car-photos-*`).
// generateStaticParams for [locale] is already declared in [locale]/layout.tsx.

type PublicCar = FleetCar & { vehicleCondition?: string | null; modelYear?: number | null };

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getCars(lang: string): Promise<PublicCar[]> {
  try {
    const res = await fetch(
      `${API}/public/cars?lang=${encodeURIComponent(lang)}`,
      { cache: "force-cache", next: { tags: ["cars"] } },
    );
    if (!res.ok) return [];
    // nextAvailableDate is computed by the API; the "cars" tag is revalidated
    // on booking and availability-block mutations, so it stays fresh.
    return res.json();
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
    title: `${t.fleet.title} — Vitecamion`,
    description: t.fleet.sub,
    openGraph: {
      title: `${t.fleet.title} — Vitecamion`,
      description: t.fleet.sub,
    },
  };
}

export default async function FleetPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale);
  const locale = params.locale;
  const cars = await getCars(locale);

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBgGlow} />
          <div className={styles.heroBgGrid} />
        </div>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>{t.fleet.eyebrow}</p>
          <h1 className={styles.heroTitle}>{t.fleet.title}</h1>
          <p className={styles.heroSub}>{t.fleet.sub}</p>
        </div>
      </div>

      {/* ── Cars grid ── */}
      {cars.length === 0 ? (
        <p className={styles.empty}>{t.fleet.empty}</p>
      ) : (
        <FleetGrid carIds={cars.map(c => c.id)}>
          {cars.map(car => (
            <CarCard key={car.id} car={car} locale={locale} />
          ))}
        </FleetGrid>
      )}

    </div>
  );
}

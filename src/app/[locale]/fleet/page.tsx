import type { Metadata } from "next";
import { getTranslations, LOCALES } from "@/lib/i18n";
import { probeNextAvailableDate } from "@/lib/probeNextAvailable";
import styles from "./fleet.module.css";
import FleetGrid, { type FleetCar } from "./FleetGrid";
import CarCard from "./CarCard";

// Fully static — invalidated via revalidateTag("cars") / revalidateTag(`car-photos-*`).
export const dynamic = "force-static";

export function generateStaticParams() {
  return LOCALES.map(locale => ({ locale }));
}

type PublicCar = FleetCar & { vehicleCondition?: string | null; modelYear?: number | null };

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getCars(lang: string): Promise<PublicCar[]> {
  try {
    const res = await fetch(
      `${API}/public/cars?lang=${encodeURIComponent(lang)}`,
      { cache: "force-cache", next: { tags: ["cars"] } },
    );
    if (!res.ok) return [];
    const cars: PublicCar[] = await res.json();

    return Promise.all(
      cars.map(async (car) => {
        if (car.isAvailable) return car;
        const nextAvailableDate = await probeNextAvailableDate(car.id).catch(() => null);
        return { ...car, nextAvailableDate };
      }),
    );
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
        <p className={styles.empty}>No vehicles available right now. Check back soon.</p>
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

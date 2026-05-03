import { getTranslations } from "@/lib/i18n";
import styles from "./fleet.module.css";
import FleetGrid, { type FleetCar } from "./FleetGrid";

type PublicCar = FleetCar & { vehicleCondition?: string | null; modelYear?: number | null };

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function probeNextAvailableDate(carId: string): Promise<string | null> {
  const base = new Date();
  base.setUTCHours(10, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + 1);

  const results = await Promise.allSettled(
    Array.from({ length: 14 }, (_, i) => {
      const d     = new Date(base.getTime() + i * 86_400_000);
      const start = d.toISOString().slice(0, 10) + "T10:00";
      const end   = d.toISOString().slice(0, 10) + "T11:00";
      return fetch(
        `${API}/public/cars/${carId}/availability?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
        { next: { revalidate: 300 } },
      ).then(r => r.ok ? r.json() as Promise<{ available: boolean }> : null);
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value?.available === true) {
      return new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    }
  }
  return null;
}

async function getCars(lang: string): Promise<PublicCar[]> {
  try {
    const res = await fetch(
      `${API}/public/cars?lang=${encodeURIComponent(lang)}`,
      { cache: "no-store" },
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

export default async function FleetPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { start?: string; end?: string };
}) {
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
        <FleetGrid
          cars={cars}
          locale={locale}
          initialStart={searchParams.start}
          initialEnd={searchParams.end}
        />
      )}

    </div>
  );
}

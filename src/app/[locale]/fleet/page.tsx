import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import styles from "./fleet.module.css";

interface PublicCar {
  id: string;
  name: string;
  description: string | null;
  hasPhoto: boolean;
  isAvailable: boolean;
  nextAvailableDate?: string | null;
  vehicleType?: string | null;
  energy?: string | null;
  gearbox?: string | null;
  numberOfSeats?: number | null;
  mileage?: string | null;
  vehicleCondition?: string | null;
  modelYear?: number | null;
}

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
        <div className={styles.grid}>
          {cars.map((car) => (
            <Link key={car.id} href={`/${locale}/fleet/${car.id}`} className={styles.card}>
              <div className={styles.photoWrap}>
                {car.hasPhoto ? (
                  <Image
                    src={`/next-api/public/cars/${car.id}/photo`}
                    alt={car.name}
                    fill
                    className={styles.photo}
                    sizes="(max-width: 768px) 100vw, 340px"
                  />
                ) : (
                  <div className={styles.photoPlaceholder}>🚗</div>
                )}
                {car.isAvailable ? (
                  <span className={`${styles.badge} ${styles.badgeAvail}`}>
                    {t.fleet.availableToday}
                  </span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeFrom}`}>
                    {car.nextAvailableDate
                      ? `${t.fleet.availableFrom} ${new Date(car.nextAvailableDate + "T00:00:00Z").toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
                      : t.fleet.availableFrom
                    }
                  </span>
                )}
              </div>
              <div className={styles.info}>
                <h2 className={styles.carName}>{car.name}</h2>
                {car.description && <p className={styles.carDesc}>{car.description}</p>}
                {(car.vehicleType || car.energy || car.gearbox || car.numberOfSeats || car.mileage) && (
                  <div className={styles.specs}>
                    {car.vehicleType   && <span className={styles.spec}>{car.vehicleType}</span>}
                    {car.energy        && <span className={styles.spec}>{car.energy}</span>}
                    {car.gearbox       && <span className={styles.spec}>{car.gearbox}</span>}
                    {car.numberOfSeats && <span className={styles.spec}>{car.numberOfSeats} seats</span>}
                    {car.mileage       && <span className={styles.spec}>{car.mileage} km</span>}
                  </div>
                )}
                <span className={styles.cta}>{t.carDetail.viewDetails}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}

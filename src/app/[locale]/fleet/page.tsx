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
  vehicleType?: string | null;
  energy?: string | null;
  gearbox?: string | null;
  numberOfSeats?: number | null;
  mileage?: string | null;
  vehicleCondition?: string | null;
  modelYear?: number | null;
}

async function getCars(lang: string): Promise<PublicCar[]> {
  try {
    const res = await fetch(
      `${process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000"}/api/public/cars?lang=${encodeURIComponent(lang)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    return res.json();
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
                <span className={`${styles.badge} ${car.isAvailable ? styles.badgeAvail : styles.badgeBusy}`}>
                  {car.isAvailable ? t.fleet.available : t.fleet.rented}
                </span>
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

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
}

async function getCars(): Promise<PublicCar[]> {
  try {
    const res = await fetch(
      `${process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000"}/api/public/cars`,
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
  const cars = await getCars();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <Link href={`/${params.locale}`} className={styles.back}>← {t.nav.home}</Link>
        <h1 className={styles.title}>{t.fleet.title}</h1>
        <p className={styles.sub}>{t.fleet.sub}</p>
      </header>

      {cars.length === 0 ? (
        <p className={styles.empty}>No vehicles available right now. Check back soon.</p>
      ) : (
        <div className={styles.grid}>
          {cars.map((car) => (
            <div key={car.id} className={styles.card}>
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
                <a href="#contact" className={styles.cta}>{t.nav.bookNow}</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

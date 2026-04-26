import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "../../LangSwitcher";
import NavHamburger from "../../NavHamburger";
import CarSlider from "./CarSlider";
import styles from "./car-public.module.css";
import landingStyles from "../../../page.module.css";

interface PublicCarDetail {
  id: string;
  name: string;
  description?: string | null;
  isAvailable: boolean;
  brand?: string | null;
  model?: string | null;
  finishing?: string | null;
  modelYear?: number | null;
  vehicleType?: string | null;
  energy?: string | null;
  din?: number | null;
  gearbox?: string | null;
  numberOfDoors?: number | null;
  numberOfSeats?: number | null;
  color?: string | null;
  mileage?: string | null;
  vehicleCondition?: string | null;
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getCar(id: string): Promise<PublicCarDetail | null> {
  try {
    const res = await fetch(`${API}/api/public/cars/${id}`, { cache: "no-store" });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function getPhotos(id: string): Promise<{ id: string }[]> {
  try {
    const res = await fetch(`${API}/api/public/cars/${id}/photos`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

type SpecItem = { icon: string; label: string; value: string };

function buildSpecs(car: PublicCarDetail): SpecItem[] {
  const items: (SpecItem | false)[] = [
    !!car.vehicleType  && { icon: "🚗", label: "Type",        value: car.vehicleType },
    !!car.brand        && { icon: "🏷️",  label: "Brand",       value: car.brand! },
    !!car.model        && { icon: "📋",  label: "Model",       value: car.model! },
    !!car.finishing    && { icon: "✨",  label: "Finishing",   value: car.finishing! },
    !!car.modelYear    && { icon: "📅",  label: "Year",        value: String(car.modelYear) },
    !!car.energy       && { icon: "⛽",  label: "Energy",      value: car.energy! },
    !!car.gearbox      && { icon: "⚙️",  label: "Gearbox",     value: car.gearbox! },
    !!car.din          && { icon: "🔧",  label: "Power",       value: `${car.din} hp` },
    !!car.mileage      && { icon: "📏",  label: "Mileage",     value: `${car.mileage} km` },
    !!car.numberOfDoors && { icon: "🚪", label: "Doors",       value: String(car.numberOfDoors) },
    !!car.numberOfSeats && { icon: "💺", label: "Seats",       value: String(car.numberOfSeats) },
    !!car.color        && { icon: "🎨",  label: "Color",       value: car.color! },
    !!car.vehicleCondition && { icon: "🔍", label: "Condition", value: car.vehicleCondition! },
  ];
  return items.filter(Boolean) as SpecItem[];
}

export default async function CarDetailPage({ params }: { params: { locale: string; id: string } }) {
  const { locale, id } = params;
  const t = getTranslations(locale);
  const [car, photos] = await Promise.all([getCar(id), getPhotos(id)]);

  if (!car) {
    return (
      <div className={styles.notFound}>
        <p>Vehicle not found.</p>
        <Link href={`/${locale}/fleet`} className={styles.backLink}>← Back to Fleet</Link>
      </div>
    );
  }

  const specs = buildSpecs(car);
  const photoIds = photos.map(p => p.id);
  const title = [car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name;

  return (
    <div className={styles.page}>

      {/* ── Navbar ── */}
      <header className={landingStyles.navbar}>
        <div className={landingStyles.navInner}>
          <Link href={`/${locale}`} className={landingStyles.logo}>
            <span className={landingStyles.logoIcon}>🚐</span>
            <span className={landingStyles.logoText}>vitecamion</span>
          </Link>
          <nav className={landingStyles.navLinks}>
            <Link href={`/${locale}`}           className={landingStyles.navLink}>{t.nav.home}</Link>
            <Link href={`/${locale}/fleet`}      className={landingStyles.navLink}>{t.nav.bookNow}</Link>
            <Link href={`/${locale}/contact`}    className={landingStyles.navLink}>{t.nav.contact}</Link>
          </nav>
          <div className={landingStyles.navRight}>
            <LangSwitcher locale={locale} />
            <NavHamburger
              links={[
                { href: `/${locale}`,        label: t.nav.home },
                { href: `/${locale}/fleet`,  label: t.nav.bookNow },
                { href: `/${locale}/contact`,label: t.nav.contact },
              ]}
              ctaLabel={t.nav.bookNow}
            />
          </div>
        </div>
      </header>

      {/* ── Back breadcrumb ── */}
      <div className={styles.breadcrumb}>
        <Link href={`/${locale}/fleet`} className={styles.backLink}>← {t.fleet.title}</Link>
      </div>

      {/* ── Slider hero ── */}
      <div className={styles.sliderSection}>
        <CarSlider carId={car.id} photoIds={photoIds} carName={car.name} />
        <div className={styles.sliderBadge}>
          <span className={car.isAvailable ? styles.badgeAvail : styles.badgeBusy}>
            {car.isAvailable ? t.fleet.available : t.fleet.rented}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>

        {/* Title + CTA row */}
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.carName}>{title}</h1>
            {title !== car.name && <p className={styles.carSub}>{car.name}</p>}
          </div>
          <Link href={`/${locale}/contact`} className={styles.bookBtn}>
            {t.nav.bookNow}
          </Link>
        </div>

        {/* Description */}
        {car.description && (
          <p className={styles.description}>{car.description}</p>
        )}

        {/* Specs grid */}
        {specs.length > 0 && (
          <div className={styles.specsSection}>
            <h2 className={styles.specsTitle}>Specifications</h2>
            <div className={styles.specsGrid}>
              {specs.map(s => (
                <div key={s.label} className={styles.specCard}>
                  <span className={styles.specIcon}>{s.icon}</span>
                  <span className={styles.specValue}>{s.value}</span>
                  <span className={styles.specLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className={styles.ctaSection}>
          <p className={styles.ctaText}>Interested in this vehicle?</p>
          <Link href={`/${locale}/contact`} className={styles.bookBtnLarge}>
            {t.nav.bookNow}
          </Link>
        </div>

      </div>
    </div>
  );
}

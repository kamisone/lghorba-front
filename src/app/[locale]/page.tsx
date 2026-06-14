import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { probeNextAvailableDate } from "@/lib/probeNextAvailable";
import FleetCarousel, { type CarouselCar } from "@/components/FleetCarousel";
import CarSearchForm from "@/components/CarSearchForm";
import {
  ShieldCheck,
  Car,
  Truck,
  Package,
  Search,
  CalendarDays,
  Navigation,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import { TuroLogo, GetaroundLogo } from "@/components/icons/PlatformLogos";
import styles from "../page.module.css";

const API_SERVER = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getBusinessTimezone(): Promise<string> {
  try {
    const res = await fetch(`${API_SERVER}/public/platform-settings`, { cache: "no-store" });
    if (!res.ok) return "Europe/Paris";
    const data = await res.json() as { timezone?: string };
    return data.timezone ?? "Europe/Paris";
  } catch {
    return "Europe/Paris";
  }
}

async function getPublicCars(locale: string): Promise<CarouselCar[]> {
  try {
    const res = await fetch(
      `${API_SERVER}/public/cars?lang=${encodeURIComponent(locale)}`,
      { cache: "force-cache", next: { tags: ["cars"] } },
    );
    if (!res.ok) return [];
    const cars: CarouselCar[] = await res.json();

    return Promise.all(
      cars.map(async (car) => {
        try {
          const [photos, nextAvailableDate] = await Promise.all([
            fetch(`${API_SERVER}/public/cars/${car.id}/photos`, {
              cache: "force-cache",
              next: { tags: [`car-photos-${car.id}`] },
            })
              .then(r => r.ok ? r.json() as Promise<{ id: string }[]> : [])
              .catch(() => [] as { id: string }[]),
            car.isAvailable ? Promise.resolve(null) : probeNextAvailableDate(car.id),
          ]);
          return { ...car, photoIds: (photos as { id: string }[]).map(p => p.id), nextAvailableDate };
        } catch {
          return { ...car, photoIds: [], nextAvailableDate: null };
        }
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
  const siteTitle = `Vitecamion — ${t.meta.homeTitle}`;
  return {
    title: siteTitle,
    description: t.hero.sub,
    openGraph: { title: siteTitle, description: t.hero.sub },
  };
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale);
  const locale = params.locale;
  const [cars, businessTz] = await Promise.all([
    getPublicCars(locale),
    getBusinessTimezone(),
  ]);

  const fleetItems = [
    { Icon: Car,   variantClass: "fleetCardCity", ...t.fleet.city },
    { Icon: Truck, variantClass: "fleetCardSuv",  ...t.fleet.suv },
    { Icon: Package, variantClass: "fleetCardVan", ...t.fleet.van },
  ];

  const howIcons = [Search, CalendarDays, Navigation];

  return (
    <div className={styles.root}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <video
          className={styles.heroVideo}
          src="/assets/cars/rentals_hero_bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          aria-hidden="true"
        />
        <div className={styles.heroVideoOverlay} aria-hidden="true" />
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBgGlow1} />
          <div className={styles.heroBgGlow2} />
        </div>
        <div className={styles.heroContent}>
          <span className={styles.heroPill}>{t.hero.pill}</span>
          <h1 className={styles.heroTitle}>
            {t.hero.title1}
            <br />
            <span className={styles.heroAccent}>{t.hero.title2}</span>
          </h1>
          <p className={styles.heroSub}>{t.hero.sub}</p>
          <div className={styles.heroBtns}>
            <a href="#platforms" className={styles.btnPrimary}>{t.hero.cta1}</a>
            <a href={`/${locale}/fleet`} className={styles.btnOutline}>{t.hero.cta2}</a>
          </div>
        </div>
        <div className={styles.heroCard} aria-hidden="true">
          <div className={styles.heroCardInner}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{t.hero.stat1.num}</span>
              <span className={styles.heroStatLabel}>{t.hero.stat1.label}</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{t.hero.stat2.num}</span>
              <span className={styles.heroStatLabel}>{t.hero.stat2.label}</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{t.hero.stat3.num}</span>
              <span className={styles.heroStatLabel}>{t.hero.stat3.label}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search ── */}
      <section className={styles.searchSection}>
        <div className={styles.searchInner}>
          <div className={styles.searchHead}>
            <p className={styles.searchEyebrow}>{t.search.eyebrow}</p>
            <h2 className={styles.searchTitle}>{t.search.title}</h2>
          </div>
          <div className={styles.searchCard}>
            <CarSearchForm
              locale={locale}
              businessTz={businessTz}
              labels={{
                fromLabel:          t.search.fromLabel,
                toLabel:            t.search.toLabel,
                addressLabel:       t.search.addressLabel,
                addressPlaceholder: t.search.addressPlaceholder,
                addressOptional:    t.search.addressOptional,
                addressHelper:      t.search.addressHelper,
                searchBtn:          t.search.searchBtn,
                dateError:          t.search.dateError,
                pickupPlaceholder:  t.booking.pickupPlaceholder,
                returnPlaceholder:  t.booking.returnPlaceholder,
                clearLabel:         t.dateTimePicker.clear,
                noSlotsLabel:       t.dateTimePicker.noSlots,
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Featured fleet carousel ── */}
      {cars.length > 0 && (
        <FleetCarousel
          cars={cars}
          locale={locale}
          labels={{
            eyebrow:        t.featuredFleet.eyebrow,
            title:          t.featuredFleet.title,
            availableToday: t.fleet.availableToday,
            availableFrom:  t.fleet.availableFrom,
            viewDetails:    t.carDetail.viewDetails,
            seats:          t.featuredFleet.seats,
            prevVehicles:   t.featuredFleet.prevVehicles,
            nextVehicles:   t.featuredFleet.nextVehicles,
            prevPhoto:      t.featuredFleet.prevPhoto,
            nextPhoto:      t.featuredFleet.nextPhoto,
          }}
        />
      )}

      {/* ── Platforms ── */}
      <section id="platforms" className={styles.platforms}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>{t.platforms.eyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.platforms.title}</h2>
            <p className={styles.sectionSub}>{t.platforms.sub}</p>
          </div>
          <div className={styles.platformGrid}>

            <div className={`${styles.platformCard} ${styles.platformCardTuro}`}>
              <div className={styles.platformTop}>
                <div className={`${styles.platformIconWrap} ${styles.platformIconWrapWide}`}>
                  <TuroLogo width={40} height={15} />
                </div>
                <h3 className={styles.platformName}>{t.platforms.turo.name}</h3>
              </div>
              <div className={styles.platformBody}>
                <div className={styles.platformTags}>
                  {t.platforms.turo.features.map((f: string) => (
                    <span key={f} className={styles.platformTag}>{f}</span>
                  ))}
                </div>
                <p className={styles.platformDesc}>{t.platforms.turo.desc}</p>
                <a href="https://turo.com/us/en/drivers/49282472" className={styles.platformCta} target="_blank" rel="noopener noreferrer">
                  {t.platforms.turo.link}
                </a>
              </div>
            </div>

            <div className={`${styles.platformCard} ${styles.platformCardGetaround}`}>
              <div className={styles.platformTop}>
                <div className={styles.platformIconWrap}>
                  <GetaroundLogo width={22} height={22} />
                </div>
                <h3 className={styles.platformName}>{t.platforms.getaround.name}</h3>
              </div>
              <div className={styles.platformBody}>
                <div className={styles.platformTags}>
                  {t.platforms.getaround.features.map((f: string) => (
                    <span key={f} className={styles.platformTag}>{f}</span>
                  ))}
                </div>
                <p className={styles.platformDesc}>{t.platforms.getaround.desc}</p>
                <a href="https://fr.getaround.com/users/5054364" className={styles.platformCta} target="_blank" rel="noopener noreferrer">
                  {t.platforms.getaround.link}
                </a>
              </div>
            </div>

            <div className={`${styles.platformCard} ${styles.platformCardPrivate}`}>
              <div className={styles.platformTop}>
                <div className={styles.platformIconWrap}>
                  <ShieldCheck size={20} strokeWidth={1.75} />
                </div>
                <h3 className={styles.platformName}>{t.platforms.private.name}</h3>
              </div>
              <div className={styles.platformBody}>
                <div className={styles.platformTags}>
                  {t.platforms.private.features.map((f: string) => (
                    <span key={f} className={styles.platformTag}>{f}</span>
                  ))}
                </div>
                <p className={styles.platformDesc}>{t.platforms.private.desc}</p>
                <a href={`/${locale}/fleet`} className={styles.platformCta}>{t.platforms.private.link}</a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Fleet types ── */}
      <section id="fleet" className={styles.fleet}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>{t.fleet.eyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.fleet.title}</h2>
          </div>
          <div className={styles.fleetGrid}>
            {fleetItems.map(({ Icon, variantClass, type, desc, uses }) => (
              <div key={type} className={`${styles.fleetCard} ${styles[variantClass]}`}>
                <div className={styles.fleetCardIconRow}>
                  <div className={styles.fleetCardIconWrap}>
                    <Icon size={22} strokeWidth={1.5} />
                  </div>
                </div>
                <div className={styles.fleetCardBody}>
                  <h3 className={styles.fleetCardType}>{type}</h3>
                  <p className={styles.fleetCardDesc}>{desc}</p>
                  <div className={styles.fleetCardUses}>
                    {uses.map((u: string) => <span key={u} className={styles.fleetCardUse}>{u}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className={styles.how}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>{t.how.eyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.how.title}</h2>
          </div>
          <div className={styles.howSteps}>
            {t.how.steps.map(({ n, title, desc }, i) => {
              const StepIcon = howIcons[i];
              return (
                <div key={n} className={styles.howStep}>
                  <div className={styles.howStepBadge}>
                    <StepIcon size={22} strokeWidth={1.5} />
                  </div>
                  <span className={styles.howStepN}>{n}</span>
                  <h3 className={styles.howStepTitle}>{title}</h3>
                  <p className={styles.howStepDesc}>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why us ── */}
      <section className={styles.why}>
        <div className={styles.sectionInner}>
          <div className={styles.whyGrid}>
            <div className={styles.whyText}>
              <p className={styles.sectionEyebrow}>{t.why.eyebrow}</p>
              <h2 className={styles.sectionTitle}>{t.why.title}</h2>
              <p className={styles.whyIntro}>{t.why.intro}</p>
            </div>
            <div className={styles.whyFeatures}>
              {t.why.features.map((label) => (
                <div key={label} className={styles.whyFeature}>
                  <CheckCircle2 size={18} strokeWidth={1.75} className={styles.whyFeatureIcon} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.shopBanner}>
            <div className={styles.shopBannerIcon}>
              <ShoppingBag size={22} strokeWidth={1.75} />
            </div>
            <div className={styles.shopBannerText}>
              <p className={styles.shopBannerEyebrow}>{t.shopBanner.eyebrow}</p>
              <h3 className={styles.shopBannerTitle}>{t.shopBanner.title}</h3>
              <p className={styles.shopBannerBody}>{t.shopBanner.body}</p>
            </div>
            <Link href={`/${locale}/shop`} className={styles.shopBannerCta}>
              {t.shopBanner.cta}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

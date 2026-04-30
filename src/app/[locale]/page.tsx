import { getTranslations } from "@/lib/i18n";
import FleetCarousel, { type CarouselCar } from "@/components/FleetCarousel";
import styles from "../page.module.css";

const API_SERVER = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getPublicCars(locale: string): Promise<CarouselCar[]> {
  try {
    const res = await fetch(
      `${API_SERVER}/api/public/cars?lang=${encodeURIComponent(locale)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const cars: CarouselCar[] = await res.json();

    // Fetch photo IDs for each car in parallel so the in-card slider has content
    return Promise.all(
      cars.map(async (car) => {
        try {
          const r = await fetch(`${API_SERVER}/api/public/cars/${car.id}/photos`, { cache: "no-store" });
          const photos: { id: string }[] = r.ok ? await r.json() : [];
          return { ...car, photoIds: photos.map((p) => p.id) };
        } catch {
          return { ...car, photoIds: [] };
        }
      }),
    );
  } catch {
    return [];
  }
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale);
  const locale = params.locale;
  const cars = await getPublicCars(locale);

  const fleetItems = [
    { icon: "🚗", variantClass: "fleetCardCity", ...t.fleet.city },
    { icon: "🚙", variantClass: "fleetCardSuv",  ...t.fleet.suv },
    { icon: "🚐", variantClass: "fleetCardVan",  ...t.fleet.van },
  ];

  const HOW_ICONS = ["🔍", "📅", "🚗"];

  return (
    <div className={styles.root}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBgGlow1} />
          <div className={styles.heroBgGlow2} />
          <div className={styles.heroBgGrid} />
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
            <a href="#platforms" className={styles.btnPrimary}>
              {t.hero.cta1}
            </a>
            <a href={`/${locale}/fleet`} className={styles.btnOutline}>
              {t.hero.cta2}
            </a>
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

      {/* ── Featured fleet carousel ── */}
      {cars.length > 0 && (
        <FleetCarousel
          cars={cars}
          locale={locale}
          labels={{
            eyebrow:     t.featuredFleet.eyebrow,
            title:       t.featuredFleet.title,
            available:   t.fleet.available,
            rented:      t.fleet.rented,
            viewDetails: t.carDetail.viewDetails,
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

            {/* Turo */}
            <div className={`${styles.platformCard} ${styles.platformCardTuro}`}>
              <div className={styles.platformTop}>
                <div className={styles.platformIconWrap}>🚘</div>
                <div className={styles.platformTopMeta}>
                  <h3 className={styles.platformName}>{t.platforms.turo.name}</h3>
                </div>
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

            {/* Getaround */}
            <div className={`${styles.platformCard} ${styles.platformCardGetaround}`}>
              <div className={styles.platformTop}>
                <div className={styles.platformIconWrap}>🚙</div>
                <div className={styles.platformTopMeta}>
                  <h3 className={styles.platformName}>{t.platforms.getaround.name}</h3>
                </div>
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

            {/* Private */}
            <div className={`${styles.platformCard} ${styles.platformCardPrivate}`}>
              <div className={styles.platformTop}>
                <div className={styles.platformIconWrap}>🤝</div>
                <div className={styles.platformTopMeta}>
                  <h3 className={styles.platformName}>{t.platforms.private.name}</h3>
                </div>
              </div>
              <div className={styles.platformBody}>
                <div className={styles.platformTags}>
                  {t.platforms.private.features.map((f: string) => (
                    <span key={f} className={styles.platformTag}>{f}</span>
                  ))}
                </div>
                <p className={styles.platformDesc}>{t.platforms.private.desc}</p>
                <a href={`/${locale}/fleet`} className={styles.platformCta}>
                  {t.platforms.private.link}
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Fleet ── */}
      <section id="fleet" className={styles.fleet}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>{t.fleet.eyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.fleet.title}</h2>
          </div>
          <div className={styles.fleetGrid}>
            {fleetItems.map(({ icon, variantClass, type, desc, uses }) => (
              <div key={type} className={`${styles.fleetCard} ${styles[variantClass]}`}>
                <div className={styles.fleetCardVisual}>
                  <span className={styles.fleetCardEmoji}>{icon}</span>
                </div>
                <div className={styles.fleetCardBody}>
                  <h3 className={styles.fleetCardType}>{type}</h3>
                  <p className={styles.fleetCardDesc}>{desc}</p>
                  <div className={styles.fleetCardUses}>
                    {uses.map((u: string) => (
                      <span key={u} className={styles.fleetCardUse}>{u}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.fleetCta}>
            <a href={`/${locale}/fleet`} className={styles.fleetCtaBtn}>{t.fleet.sub}</a>
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
            {t.how.steps.map(({ n, title, desc }, i) => (
              <div key={n} className={styles.howStep}>
                <div className={styles.howStepBadge}>
                  <span className={styles.howStepN}>{n}</span>
                  <span className={styles.howStepIcon}>{HOW_ICONS[i]}</span>
                </div>
                <h3 className={styles.howStepTitle}>{title}</h3>
                <p className={styles.howStepDesc}>{desc}</p>
              </div>
            ))}
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
                  <span className={styles.whyFeatureIcon}>✓</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

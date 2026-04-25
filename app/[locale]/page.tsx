import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "./LangSwitcher";
import NavHamburger from "./NavHamburger";
import styles from "../page.module.css";

export default function LandingPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale);
  const locale = params.locale;

  const fleetItems = [
    { icon: "🚗", ...t.fleet.city },
    { icon: "🚙", ...t.fleet.suv },
    { icon: "🚐", ...t.fleet.van },
  ];

  return (
    <div className={styles.root}>

      {/* ── Navbar ── */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🚐</span>
            <span className={styles.logoText}>vitecamion</span>
          </div>
          <nav className={styles.navLinks}>
            <a href="#fleet"     className={styles.navLink}>{t.nav.fleet}</a>
            <a href="#platforms" className={styles.navLink}>{t.nav.platforms}</a>
            <a href="#how"       className={styles.navLink}>{t.nav.howItWorks}</a>
            <a href="#contact"   className={styles.navLink}>{t.nav.contact}</a>
          </nav>
          <div className={styles.navRight}>
            <LangSwitcher locale={locale} />
            <a href="#contact" className={`${styles.navCta} ${styles.navCtaDesktop}`}>{t.nav.bookNow}</a>
            <NavHamburger
              links={[
                { href: "#fleet",     label: t.nav.fleet },
                { href: "#platforms", label: t.nav.platforms },
                { href: "#how",       label: t.nav.howItWorks },
                { href: "#contact",   label: t.nav.contact },
              ]}
              ctaLabel={t.nav.bookNow}
            />
          </div>
        </div>
      </header>

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
            {t.hero.title1}<br />
            <span className={styles.heroAccent}>{t.hero.title2}</span>
          </h1>
          <p className={styles.heroSub}>{t.hero.sub}</p>
          <div className={styles.heroBtns}>
            <a href="#platforms" className={styles.btnPrimary}>{t.hero.cta1}</a>
            <a href="#fleet"     className={styles.btnOutline}>{t.hero.cta2}</a>
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

      {/* ── Platforms ── */}
      <section id="platforms" className={styles.platforms}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>{t.platforms.eyebrow}</p>
          <h2 className={styles.sectionTitle}>{t.platforms.title}</h2>
          <div className={styles.platformGrid}>
            <div className={styles.platformCard}>
              <div className={styles.platformIcon} style={{ background: "#1a1a2e" }}>🚘</div>
              <h3 className={styles.platformName}>{t.platforms.turo.name}</h3>
              <p className={styles.platformDesc}>{t.platforms.turo.desc}</p>
              <a href="#contact" className={styles.platformLink}>{t.platforms.turo.link}</a>
            </div>
            <div className={`${styles.platformCard} ${styles.platformCardFeatured}`}>
              <div className={styles.platformBadge}>{t.platforms.getaround.badge}</div>
              <div className={styles.platformIcon} style={{ background: "#0d2137" }}>🚙</div>
              <h3 className={styles.platformName}>{t.platforms.getaround.name}</h3>
              <p className={styles.platformDesc}>{t.platforms.getaround.desc}</p>
              <a href="#contact" className={styles.platformLink}>{t.platforms.getaround.link}</a>
            </div>
            <div className={styles.platformCard}>
              <div className={styles.platformIcon} style={{ background: "#1a0a00" }}>🤝</div>
              <h3 className={styles.platformName}>{t.platforms.private.name}</h3>
              <p className={styles.platformDesc}>{t.platforms.private.desc}</p>
              <a href="#contact" className={styles.platformLink}>{t.platforms.private.link}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fleet ── */}
      <section id="fleet" className={styles.fleet}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>{t.fleet.eyebrow}</p>
          <h2 className={styles.sectionTitle}>{t.fleet.title}</h2>
          <div className={styles.fleetGrid}>
            {fleetItems.map(({ icon, type, desc }) => (
              <div key={type} className={styles.fleetCard}>
                <div className={styles.fleetCardEmoji}>{icon}</div>
                <h3 className={styles.fleetCardType}>{type}</h3>
                <p className={styles.fleetCardDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className={styles.how}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>{t.how.eyebrow}</p>
          <h2 className={styles.sectionTitle}>{t.how.title}</h2>
          <div className={styles.howSteps}>
            {t.how.steps.map(({ n, title, desc }) => (
              <div key={n} className={styles.howStep}>
                <span className={styles.howStepNum}>{n}</span>
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

      {/* ── CTA ── */}
      <section id="contact" className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>{t.cta.title}</h2>
          <p className={styles.ctaSub}>{t.cta.sub}</p>
          <div className={styles.ctaBtns}>
            <a href="mailto:info@vitecamion.com" className={styles.btnPrimary}>
              info@vitecamion.com
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span className={styles.logoIcon}>🚐</span>
            <span className={styles.logoText}>vitecamion</span>
          </div>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} vitecamion · {t.footer.rights}
          </p>
          <div className={styles.footerLinks}>
            <Link href={`/${locale}/privacy-policy`} className={styles.footerLink}>{t.footer.privacy}</Link>
            <Link href="/login" className={styles.footerLink}>{t.footer.admin}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { getPageContent } from "@/lib/getPageContent";
import styles from "./about.module.css";
import privacyStyles from "../privacy-policy/privacy.module.css";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslations(params.locale).about;
  return {
    title: `${t.title} — Vitecamion`,
    description: t.mission,
  };
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const t = getTranslations(locale);
  const a = t.about;
  const cms = await getPageContent("about", locale);

  // Only show stats when the CMS has at least one entry with content
  const cmsStats = cms?.stats?.filter(s => s.num?.trim() || s.label?.trim());

  // When CMS has sections, render the CMS-driven layout
  if (cms?.sections?.length) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroBg} aria-hidden="true">
            <div className={styles.heroBgGlow} />
            <div className={styles.heroBgGrid} />
          </div>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{cms.title?.trim() || a.title}</h1>
            <p className={styles.heroMission}>{cms.intro?.trim() || a.mission}</p>
          </div>
        </section>

        <div className={styles.content}>
          {cmsStats?.length && (
            <section className={styles.statsSection}>
              <p className={styles.eyebrow}>{a.statsLabel}</p>
              <div className={styles.statsGrid}>
                {cmsStats.map((s, i) => (
                  <div key={i} className={styles.statCard}>
                    <span className={styles.statNum}>{s.num}</span>
                    <span className={styles.statLabel}>{s.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {cms.sections.map((sec, i) => (
            <section key={i} className={privacyStyles.section}>
              <h2 className={privacyStyles.sectionTitle}>{sec.title}</h2>
              <div
                className={privacyStyles.sectionBody}
                dangerouslySetInnerHTML={{ __html: sec.body }}
              />
            </section>
          ))}

          <section className={styles.ctaSection}>
            <h2 className={styles.ctaTitle}>{a.contactLabel}</h2>
            <p className={styles.ctaBody}>{a.contactBody}</p>
            <Link href={`/${locale}/contact`} className={styles.ctaBtn}>
              {a.contactCta}
            </Link>
          </section>
        </div>
      </div>
    );
  }

  // Default: translation-driven layout
  return (
    <div className={styles.page}>

      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBgGlow} />
          <div className={styles.heroBgGrid} />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{a.title}</h1>
          <p className={styles.heroMission}>{a.mission}</p>
        </div>
      </section>

      <div className={styles.content}>

        {cmsStats?.length && (
          <section className={styles.statsSection}>
            <p className={styles.eyebrow}>{a.statsLabel}</p>
            <div className={styles.statsGrid}>
              {cmsStats.map((s, i) => (
                <div key={i} className={styles.statCard}>
                  <span className={styles.statNum}>{s.num}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{a.storyLabel}</h2>
          <p className={styles.sectionBody}>{a.story}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{a.fleetLabel}</h2>
          <p className={styles.sectionBody}>{a.fleet}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{a.platformsLabel}</h2>
          <p className={styles.sectionBody}>{a.platforms}</p>
        </section>

        <section className={styles.valuesSection}>
          <h2 className={styles.sectionTitle}>{a.valuesLabel}</h2>
          <div className={styles.valuesGrid}>
            {a.values.map(v => (
              <div key={v.title} className={styles.valueCard}>
                <span className={styles.valueIcon} aria-hidden="true">{v.icon}</span>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueBody}>{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>{a.contactLabel}</h2>
          <p className={styles.ctaBody}>{a.contactBody}</p>
          <Link href={`/${locale}/contact`} className={styles.ctaBtn}>
            {a.contactCta}
          </Link>
        </section>

      </div>
    </div>
  );
}

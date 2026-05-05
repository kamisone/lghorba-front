import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import { getPageContent } from "@/lib/getPageContent";
import styles from "../privacy-policy/privacy.module.css";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslations(params.locale).legal;
  return { title: `${t.title} — Vitecamion`, robots: { index: false } };
}

export default async function LegalPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale).legal;
  const cms = await getPageContent("legal", params.locale);

  const hasCms = !!(cms?.sections?.length);
  const title    = cms?.title?.trim()    || t.title;
  const intro    = cms?.intro?.trim()    || t.intro;
  const sections = hasCms
    ? cms!.sections
    : t.sections.map(s => ({ title: s.title, body: s.body }));

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.updated}>{t.updated}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.intro}>{intro}</p>
        {sections.map((sec, i) => (
          <section key={i} className={styles.section}>
            <h2 className={styles.sectionTitle}>{sec.title}</h2>
            {hasCms ? (
              <div
                className={styles.sectionBody}
                dangerouslySetInnerHTML={{ __html: sec.body }}
              />
            ) : (
              <p className={styles.sectionBody}>{sec.body}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

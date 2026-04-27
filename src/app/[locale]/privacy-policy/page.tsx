import { getTranslations } from "@/lib/i18n";
import styles from "./privacy.module.css";

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale).privacy;
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.intro}>{t.intro}</p>
        {[
          { title: t.s1title, body: t.s1 },
          { title: t.s2title, body: t.s2 },
          { title: t.s3title, body: t.s3 },
          { title: t.s4title, body: t.s4 },
          { title: t.s5title, body: t.s5 },
          { title: t.s6title, body: t.s6 },
          { title: t.s7title, body: t.s7 },
        ].map(({ title, body }) => (
          <section key={title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <p className={styles.sectionBody}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

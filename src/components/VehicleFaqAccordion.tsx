import styles from "./VehicleFaqAccordion.module.css";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  faqs: FaqItem[];
  title: string;
  toggleLabel: string;
  dark?: boolean;
}

export default function VehicleFaqAccordion({ faqs, title, toggleLabel, dark = false }: Props) {
  if (!faqs.length) return null;

  return (
    <section className={`${styles.section} ${dark ? styles.dark : ""}`} aria-labelledby="faq-heading">
      <h2 id="faq-heading" className={styles.heading}>{title}</h2>
      <dl className={styles.list}>
        {faqs.map((faq) => (
          <div key={faq.id} className={styles.item}>
            <details className={styles.details}>
              <summary className={styles.summary}>
                <span className={styles.question}>{faq.question}</span>
                <span className={styles.chevron} aria-hidden="true" aria-label={toggleLabel} />
              </summary>
              <div className={styles.answer}>
                <p>{faq.answer}</p>
              </div>
            </details>
          </div>
        ))}
      </dl>
    </section>
  );
}

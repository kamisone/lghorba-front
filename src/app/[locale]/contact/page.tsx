"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import styles from "./contact.module.css";
import landingStyles from "../../page.module.css";

export default function ContactPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const t = getTranslations(locale).contact;

  const [form, setForm] = useState({ name: "", contact: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/next-api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          contact: form.contact.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className={styles.page}>

      {/* ── Navbar ── */}
      <header className={landingStyles.navbar}>
        <div className={landingStyles.navInner}>
          <Link href={`/${locale}`} className={landingStyles.logo}>
            <span className={landingStyles.logoIcon}>🚐</span>
            <span className={landingStyles.logoText}>vitecamion</span>
          </Link>
          <div className={landingStyles.navRight}>
            <LangSwitcher locale={locale} />
            <Link href={`/${locale}`} className={styles.backLink}>{t.backHome}</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBgGlow} />
          <div className={styles.heroBgGrid} />
        </div>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>{t.eyebrow}</span>
          <h1 className={styles.heroTitle}>{t.title}</h1>
          <p className={styles.heroSub}>{t.sub}</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className={styles.formSection}>
        <div className={styles.formCard}>
          {status === "success" ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.successTitle}>{t.successTitle}</h2>
              <p className={styles.successSub}>{t.successSub}</p>
              <Link href={`/${locale}`} className={styles.backBtn}>{t.backHome}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>{t.name} <span className={styles.req}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t.namePlaceholder}
                    value={form.name}
                    onChange={set("name")}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t.contactField} <span className={styles.req}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t.contactPlaceholder}
                    value={form.contact}
                    onChange={set("contact")}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.subject} <span className={styles.req}>*</span></label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder={t.subjectPlaceholder}
                  value={form.subject}
                  onChange={set("subject")}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.message} <span className={styles.req}>*</span></label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder={t.messagePlaceholder}
                  value={form.message}
                  onChange={set("message")}
                  rows={5}
                  required
                />
              </div>

              {status === "error" && (
                <p className={styles.errorMsg}>{t.error}</p>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={status === "sending"}
              >
                {status === "sending" ? t.submitting : t.submit}
              </button>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}

"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Translations } from "@/lib/i18n/translations";
import styles from "@/app/login/login.module.css";
import MfaForm from "./MfaForm";

type T = Translations["login"];

interface MfaState {
  challengeToken: string;
  availableMethods: ("email" | "sms")[];
  preferredMethod: "email" | "sms";
  maskedDestination: string;
}

export default function LoginForm({ t }: { t: T }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [mfa,      setMfa]      = useState<MfaState | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/next-api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mfaRequired) {
          setMfa({
            challengeToken:  data.challengeToken,
            availableMethods: data.availableMethods,
            preferredMethod: data.preferredMethod,
            maskedDestination: data.maskedDestination,
          });
        } else {
          router.replace(searchParams.get("from") || "/admin");
        }
      } else {
        setError(t.errorInvalid);
      }
    } catch {
      setError(t.errorNetwork);
    } finally {
      setLoading(false);
    }
  };

  if (mfa) {
    return (
      <MfaForm
        {...mfa}
        onSuccess={() => router.replace(searchParams.get("from") || "/admin")}
        onBack={() => { setMfa(null); setPassword(""); setError(""); }}
      />
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <img src="/assets/logo_vitecamion_icon.png" alt="vitecamion" className={styles.logoIcon} />
        </div>
        <h1 className={styles.title}>vitecamion</h1>
        <p className={styles.subtitle}>{t.sub}</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">{t.email}</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder={t.placeholderEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">{t.password}</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder={t.placeholderPassword}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  );
}

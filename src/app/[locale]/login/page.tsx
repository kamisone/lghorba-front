import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "@/lib/i18n";
import LoginForm from "@/components/LoginForm";
import styles from "@/app/login/login.module.css";

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function isAuthenticated(): Promise<boolean> {
  const token = cookies().get("vitecamion_auth")?.value;
  if (!token) return false;
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function LoginPage({ params }: { params: { locale: string } }) {
  if (await isAuthenticated()) redirect("/admin");

  const t = getTranslations(params.locale).login;
  return (
    <div className={styles.page}>
      <Suspense>
        <LoginForm t={t} />
      </Suspense>
    </div>
  );
}

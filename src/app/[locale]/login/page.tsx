import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "@/lib/i18n";
import LoginForm from "@/components/LoginForm";
import styles from "@/app/login/login.module.css";

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

export default async function LoginPage({ params }: { params: { locale: string } }) {
  const jar          = cookies();
  const accessToken  = jar.get("vitecamion_auth")?.value;
  const refreshToken = jar.get("vitecamion_refresh")?.value;

  // 1. Validate existing access token
  if (accessToken) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (res.ok) redirect("/admin");
    } catch { /* backend unreachable — fall through */ }
  }

  // 2. Access token missing or expired — try refreshing via the route handler
  //    (server components cannot set cookies directly, so we delegate via redirect)
  if (refreshToken) {
    redirect("/next-api/auth/refresh?to=/admin");
  }

  const t = getTranslations(params.locale).login;
  return (
    <div className={styles.page}>
      <Suspense>
        <LoginForm t={t} />
      </Suspense>
    </div>
  );
}

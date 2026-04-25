import { Suspense } from "react";
import { getTranslations } from "@/lib/i18n";
import LoginForm from "./LoginForm";
import styles from "@/app/login/login.module.css";

export default function LoginPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale).login;
  return (
    <div className={styles.page}>
      <Suspense>
        <LoginForm t={t} />
      </Suspense>
    </div>
  );
}

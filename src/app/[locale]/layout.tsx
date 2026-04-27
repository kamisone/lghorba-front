import { redirect } from "next/navigation";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n";

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isValidLocale(params.locale)) {
    redirect(`/${DEFAULT_LOCALE}`);
  }
  return <>{children}</>;
}

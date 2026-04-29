import { redirect } from "next/navigation";
import { isValidLocale, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";
import ClientHeader from "@/components/layout/ClientHeader";
import ClientFooter from "@/components/layout/ClientFooter";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

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

  return (
    <>
      <ClientHeader locale={params.locale} />
      <main>{children}</main>
      <ClientFooter locale={params.locale} />
    </>
  );
}

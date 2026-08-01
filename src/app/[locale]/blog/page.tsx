import type { Metadata } from "next";
import BlogListing from "@/components/blog/BlogListing";
import { getTranslations } from "@/lib/i18n";

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = getTranslations(params.locale).blog;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title:       "Blog — vitecamion",
      description: t.metaDescription,
      type:        "website",
    },
  };
}

export default function BlogPage({ params }: Props) {
  return <BlogListing locale={params.locale} />;
}

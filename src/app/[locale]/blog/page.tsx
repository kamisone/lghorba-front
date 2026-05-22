import type { Metadata } from "next";
import BlogListing from "@/components/blog/BlogListing";

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const isEn = params.locale === "en";
  return {
    title: isEn ? "Blog — Car rental guides & travel stories" : "Blog — Guides et récits de voyage",
    description: isEn
      ? "Road trip guides, car rental advice, destination ideas and mobility stories from the vitecamion team."
      : "Guides de road trip, conseils de location de voiture, idées de destinations et récits de mobilité par l'équipe vitecamion.",
    openGraph: {
      title:       isEn ? "Blog — vitecamion" : "Blog — vitecamion",
      description: isEn ? "Road trips, car guides & travel stories." : "Road trips, guides et récits de voyage.",
      type:        "website",
    },
  };
}

export default function BlogPage({ params }: Props) {
  return <BlogListing locale={params.locale} />;
}

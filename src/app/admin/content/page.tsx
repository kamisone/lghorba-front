import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Loaded client-side only: ContentEditor → RichTextEditor → TipTap (ProseMirror has browser globals)
const ContentEditor = dynamic(
  () => import("@/components/admin/ContentEditor"),
  { ssr: false },
);

export const metadata: Metadata = { title: "Content — Admin" };

export default function ContentPage() {
  return <ContentEditor />;
}

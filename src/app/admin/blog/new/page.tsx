import type { Metadata } from "next";
import dynamic from "next/dynamic";

const BlogPostEditor = dynamic(
  () => import("@/components/admin/blog/BlogPostEditor"),
  { ssr: false },
);

export const metadata: Metadata = { title: "New article — Admin" };

export default function NewBlogPostPage() {
  return <BlogPostEditor />;
}

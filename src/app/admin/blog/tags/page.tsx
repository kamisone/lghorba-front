import type { Metadata } from "next";
import BlogTagManager from "@/components/admin/blog/BlogTagManager";

export const metadata: Metadata = { title: "Blog tags — Admin" };

export default function BlogTagsPage() {
  return <BlogTagManager />;
}

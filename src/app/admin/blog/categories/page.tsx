import type { Metadata } from "next";
import BlogCategoryManager from "@/components/admin/blog/BlogCategoryManager";

export const metadata: Metadata = { title: "Blog categories — Admin" };

export default function BlogCategoriesPage() {
  return <BlogCategoryManager />;
}

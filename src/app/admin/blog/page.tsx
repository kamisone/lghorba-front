import type { Metadata } from "next";
import BlogPostList from "@/components/admin/blog/BlogPostList";

export const metadata: Metadata = { title: "Blog — Admin" };

export default function BlogPage() {
  return <BlogPostList />;
}

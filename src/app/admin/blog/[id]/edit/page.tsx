import type { Metadata } from "next";
import dynamic from "next/dynamic";

const BlogPostEditor = dynamic(
  () => import("@/components/admin/blog/BlogPostEditor"),
  { ssr: false },
);

export const metadata: Metadata = { title: "Edit article — Admin" };

export default function EditBlogPostPage({ params }: { params: { id: string } }) {
  return <BlogPostEditor postId={params.id} />;
}

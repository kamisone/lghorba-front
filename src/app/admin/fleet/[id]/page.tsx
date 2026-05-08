import { redirect } from "next/navigation";

export default function CarDetailRoot({ params }: { params: { id: string } }) {
  redirect(`/admin/fleet/${params.id}/management`);
}

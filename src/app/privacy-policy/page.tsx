import { redirect } from "next/navigation";

export default function PrivacyFallback() {
  redirect("/en/privacy-policy");
}

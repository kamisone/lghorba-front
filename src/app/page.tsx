import { redirect } from "next/navigation";

// Middleware handles locale detection and redirects to /[locale].
// This fallback ensures /  always reaches the localized page.
export default function Root() {
  redirect("/en");
}

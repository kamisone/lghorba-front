import { redirect } from "next/navigation";

// Middleware redirects /login → /{locale}/login before this renders.
// This fallback handles any edge case.
export default function LoginFallback() {
  redirect("/en/login");
}

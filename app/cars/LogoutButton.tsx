"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LogoutButton.module.css";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/next-api/auth", { method: "DELETE" });
    router.replace("/login");
  };

  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={handleLogout} disabled={loading}>
        {loading ? "…" : "Logout"}
      </button>
    </div>
  );
}

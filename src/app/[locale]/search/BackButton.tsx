"use client";

import { useRouter } from "next/navigation";
import styles from "./search.module.css";

export default function BackButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button className={styles.backBtn} onClick={() => router.back()}>
      ← {label}
    </button>
  );
}

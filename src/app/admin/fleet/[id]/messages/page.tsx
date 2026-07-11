"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import QuickRepliesPanel from "@/components/admin/quick-replies/QuickRepliesPanel";
import type { PlaceholderVars } from "@/components/admin/quick-replies/types";
import type { Car } from "@/components/admin/fleet/data";
import styles from "./messages.module.css";

// Sub-sections of the vehicle Messages workspace. "Replies" is the first;
// future tabs (e.g. conversation history) slot in here.
const SUB_TABS = [
  { key: "replies", label: "Replies", icon: <MessageSquareText size={14} strokeWidth={1.75} /> },
] as const;

type SubTab = typeof SUB_TABS[number]["key"];

export default function VehicleMessagesPage({ params }: { params: { id: string } }) {
  const [tab,  setTab]  = useState<SubTab>("replies");
  const [vars, setVars] = useState<PlaceholderVars | undefined>(undefined);

  // Vehicle context for {{car_name}} / {{plate}} / {{phone}} substitution.
  useEffect(() => {
    fetch(`/next-api/cars/${params.id}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then((car: Car | null) => {
        if (!car) return;
        setVars({
          car_name: [car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name,
          plate:    car.immatriculation ?? "",
          phone:    car.phoneNumber ?? "",
        });
      })
      .catch(() => {});
  }, [params.id]);

  return (
    <div className={styles.page}>
      <nav className={styles.subTabs} aria-label="Message sections">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            type="button"
            className={`${styles.subTab} ${tab === t.key ? styles.subTabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {tab === "replies" && <QuickRepliesPanel vars={vars} carId={params.id} />}
    </div>
  );
}

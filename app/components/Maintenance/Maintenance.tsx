import React from "react";
import styles from "@/app/components/Maintenance/Maintenance.module.css";
import MaintenanceCharacter from "./MaintenanceCharacter/MaintenanceCharacter";

export default function Maintenance() {
  return (
    <div className={styles.container}>
      <MaintenanceCharacter />
      <article className={styles.text_container}>
        <p dir="rtl">
          نعتذر عن الإزعاج، ولكننا نقوم حاليًا ببعض الصيانة. سنعود عبر الإنترنت
          قريبًا! شكرًا لك على صبرك.
        </p>
        <p dir="ltr">
          Sorry for the inconvenience, but we're performing some maintenance at
          the moment. We'll be back online shortly! Thank you for your patience.
          
        </p>
      </article>
    </div>
  );
}

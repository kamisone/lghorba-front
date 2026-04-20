"use client";

import Link from "next/link";
import { CARS } from "./data";
import styles from "./cars.module.css";

export default function CarsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My Cars</h1>
      <div className={styles.grid}>
        {CARS.map((car) => (
          <Link key={car.id} href={`/cars/${car.id}`} className={styles.card}>
            <div className={styles.photoWrapper}>
              <img
                src={`/assets/cars/${car.id}.jpg`}
                alt={car.name}
                className={styles.photo}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const placeholder = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = "flex";
                }}
              />
              <div className={styles.photoPlaceholder} style={{ display: "none" }}>
                <span>🚗</span>
              </div>
            </div>
            <div className={styles.cardBody}>
              <h2 className={styles.carName}>{car.name}</h2>
              <p className={styles.immat}>{car.immatriculation}</p>
              {car.description && (
                <p className={styles.desc}>{car.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

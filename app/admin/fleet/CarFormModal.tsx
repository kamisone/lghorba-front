"use client";

import { useState, FormEvent, useEffect } from "react";
import type { Car } from "./data";
import styles from "./CarFormModal.module.css";

interface Props {
  car?: Car;
  onClose: () => void;
  onSaved: (car: Car) => void;
}

export default function CarFormModal({ car, onClose, onSaved }: Props) {
  const isEdit = !!car;
  const [form, setForm] = useState({
    name: "",
    immatriculation: "",
    phoneNumber: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (car) {
      setForm({
        name: car.name,
        immatriculation: car.immatriculation,
        phoneNumber: car.phoneNumber,
        description: car.description ?? "",
      });
    }
  }, [car]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = isEdit ? `/next-api/cars/${car.id}` : "/next-api/cars";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const saved: Car = await res.json();
      onSaved(saved);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? "Edit Car" : "Add Car"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="car-name">Name</label>
            <input id="car-name" className={styles.input} value={form.name} onChange={set("name")} placeholder="Peugeot 208" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="car-immat">Plate</label>
            <input id="car-immat" className={styles.input} value={form.immatriculation} onChange={set("immatriculation")} placeholder="AB-123-CD" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="car-phone">Phone number</label>
            <input id="car-phone" className={styles.input} type="tel" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+33600000000" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="car-desc">Description <span className={styles.optional}>(optional)</span></label>
            <textarea id="car-desc" className={styles.textarea} value={form.description} onChange={set("description")} placeholder="Notes about the car…" rows={2} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Add car"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

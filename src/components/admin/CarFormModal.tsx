"use client";

import { useState, FormEvent, useEffect } from "react";
import type { Car, MileageRange, VehicleType, EnergyType, GearboxType } from "./data";
import styles from "./CarFormModal.module.css";

interface Props {
  car?: Car;
  onClose: () => void;
  onSaved: (car: Car) => void;
}

const MILEAGE_OPTIONS: MileageRange[] = ["0-50","50-100","100-150","150-200","200-250","250-300","300+"];
const VEHICLE_TYPES: VehicleType[]    = ["4x4","SUV","Sedan","Estate","Convertible","City car","Cut","Minivan","Commercial vehicle"];
const ENERGY_TYPES: EnergyType[]      = ["Petrol","Diesel","Hybrid","Electric"];
const GEARBOX_TYPES: GearboxType[]    = ["Manual","Automatic"];

type FormValues = {
  name: string; immatriculation: string; phoneNumber: string; description: string;
  brand: string; model: string; finishing: string; modelYear: string; color: string;
  vehicleType: string; energy: string; gearbox: string;
  din: string; mileage: string; numberOfDoors: string; numberOfSeats: string;
  vehicleCondition: string;
};

const EMPTY: FormValues = {
  name: "", immatriculation: "", phoneNumber: "", description: "",
  brand: "", model: "", finishing: "", modelYear: "", color: "",
  vehicleType: "", energy: "", gearbox: "",
  din: "", mileage: "", numberOfDoors: "", numberOfSeats: "",
  vehicleCondition: "",
};

export default function CarFormModal({ car, onClose, onSaved }: Props) {
  const isEdit = !!car;
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (car) {
      setForm({
        name: car.name,
        immatriculation: car.immatriculation,
        phoneNumber: car.phoneNumber,
        description: car.description ?? "",
        brand: car.brand ?? "",
        model: car.model ?? "",
        finishing: car.finishing ?? "",
        modelYear: car.modelYear != null ? String(car.modelYear) : "",
        color: car.color ?? "",
        vehicleType: car.vehicleType ?? "",
        energy: car.energy ?? "",
        gearbox: car.gearbox ?? "",
        din: car.din != null ? String(car.din) : "",
        mileage: car.mileage ?? "",
        numberOfDoors: car.numberOfDoors != null ? String(car.numberOfDoors) : "",
        numberOfSeats: car.numberOfSeats != null ? String(car.numberOfSeats) : "",
        vehicleCondition: car.vehicleCondition ?? "",
      });
    }
  }, [car]);

  const set = (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        name: form.name,
        immatriculation: form.immatriculation,
        phoneNumber: form.phoneNumber,
        description: form.description || null,
        brand: form.brand || null,
        model: form.model || null,
        finishing: form.finishing || null,
        modelYear: form.modelYear ? Number(form.modelYear) : null,
        color: form.color || null,
        vehicleType: form.vehicleType || null,
        energy: form.energy || null,
        gearbox: form.gearbox || null,
        din: form.din ? Number(form.din) : null,
        mileage: form.mileage || null,
        numberOfDoors: form.numberOfDoors ? Number(form.numberOfDoors) : null,
        numberOfSeats: form.numberOfSeats ? Number(form.numberOfSeats) : null,
        vehicleCondition: form.vehicleCondition || null,
      };
      const url = isEdit ? `/next-api/cars/${car.id}` : "/next-api/cars";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onSaved(await res.json());
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? "Edit Car" : "Add Car"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── Identity ── */}
          <p className={styles.section}>Identity</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} value={form.name} onChange={set("name")} placeholder="Peugeot 208" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Plate</label>
              <input className={styles.input} value={form.immatriculation} onChange={set("immatriculation")} placeholder="AB-123-CD" required />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone number</label>
            <input className={styles.input} type="tel" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+33600000000" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description <span className={styles.optional}>(optional)</span></label>
            <textarea className={styles.textarea} value={form.description} onChange={set("description")} placeholder="Notes about the car…" rows={2} />
          </div>

          {/* ── Vehicle ── */}
          <p className={styles.section}>Vehicle</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Brand</label>
              <input className={styles.input} value={form.brand} onChange={set("brand")} placeholder="Peugeot" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Model</label>
              <input className={styles.input} value={form.model} onChange={set("model")} placeholder="208" />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Finishing</label>
              <input className={styles.input} value={form.finishing} onChange={set("finishing")} placeholder="GT Line" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Model year</label>
              <input className={styles.input} type="number" min="1980" max="2030" value={form.modelYear} onChange={set("modelYear")} placeholder="2022" />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Vehicle type</label>
              <select className={styles.select} value={form.vehicleType} onChange={set("vehicleType")}>
                <option value="">— select —</option>
                {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Color</label>
              <input className={styles.input} value={form.color} onChange={set("color")} placeholder="White" />
            </div>
          </div>

          {/* ── Technical ── */}
          <p className={styles.section}>Technical</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Energy</label>
              <select className={styles.select} value={form.energy} onChange={set("energy")}>
                <option value="">— select —</option>
                {ENERGY_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Gearbox</label>
              <select className={styles.select} value={form.gearbox} onChange={set("gearbox")}>
                <option value="">— select —</option>
                {GEARBOX_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>DIN power (hp)</label>
            <input className={styles.input} type="number" min="0" value={form.din} onChange={set("din")} placeholder="130" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Mileage</label>
            <select className={styles.select} value={form.mileage} onChange={set("mileage")}>
              <option value="">— select —</option>
              {MILEAGE_OPTIONS.map(v => <option key={v} value={v}>{v} km</option>)}
            </select>
          </div>

          {/* ── Details ── */}
          <p className={styles.section}>Details</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Doors</label>
              <input className={styles.input} type="number" min="2" max="6" value={form.numberOfDoors} onChange={set("numberOfDoors")} placeholder="5" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Seats</label>
              <input className={styles.input} type="number" min="1" max="9" value={form.numberOfSeats} onChange={set("numberOfSeats")} placeholder="5" />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Vehicle condition</label>
            <input className={styles.input} value={form.vehicleCondition} onChange={set("vehicleCondition")} placeholder="e.g. Good, minor scratches on rear bumper" />
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

"use client";

import { useState, FormEvent, useEffect } from "react";
import type { Car, MileageRange, VehicleType, EnergyType, GearboxType } from "./data";
import styles from "./CarFormModal.module.css";
import BilingualField from "./BilingualField";
import AddressAutocomplete, { type SelectedAddress } from "@/components/AddressAutocomplete";

interface ParkingOption {
  id: string;
  label: string;
  address: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  car?: Car;
  onClose: () => void;
  onSaved: (car: Car) => void;
}

const MILEAGE_OPTIONS: MileageRange[] = ["0-50","50-100","100-150","150-200","200-250","250-300","300+"];
const VEHICLE_TYPES: VehicleType[]    = ["4x4","SUV","Sedan","Estate","Convertible","City car","Cut","Minivan","Commercial vehicle"];
const ENERGY_TYPES: EnergyType[]      = ["Petrol","Diesel","Hybrid","Electric"];
const GEARBOX_TYPES: GearboxType[]    = ["Manual","Automatic"];

const TRANSLATABLE_FIELDS = ["description", "vehicleCondition", "color"] as const;
type TranslatableField = typeof TRANSLATABLE_FIELDS[number];

type FormValues = {
  name: string; immatriculation: string; phoneNumber: string; description: string;
  brand: string; model: string; finishing: string; modelYear: string; color: string;
  vehicleType: string; energy: string; gearbox: string;
  din: string; mileage: string; numberOfDoors: string; numberOfSeats: string;
  vehicleCondition: string; basePricePerDay: string; basePricePerWeekendDay: string;
};

const EMPTY: FormValues = {
  name: "", immatriculation: "", phoneNumber: "", description: "",
  brand: "", model: "", finishing: "", modelYear: "", color: "",
  vehicleType: "", energy: "", gearbox: "",
  din: "", mileage: "", numberOfDoors: "", numberOfSeats: "",
  vehicleCondition: "", basePricePerDay: "", basePricePerWeekendDay: "",
};

type EnTranslations = Record<TranslatableField, string>;
type EnTranslationIds = Partial<Record<TranslatableField, string>>;
const EMPTY_EN: EnTranslations = { description: "", vehicleCondition: "", color: "" };

export interface DeliveryLocation {
  id?: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  radiusKm: number;
  price: number | null;
}

const MAX_LOCATIONS = 10;

export default function CarFormModal({ car, onClose, onSaved }: Props) {
  const isEdit = !!car;

  const [form, setForm]                           = useState<FormValues>(EMPTY);
  const [enTranslations, setEnTranslations]       = useState<EnTranslations>(EMPTY_EN);
  const [enTranslationIds, setEnTranslationIds]   = useState<EnTranslationIds>({});
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState("");

  // Parking slot selection
  const [parkings,   setParkings]   = useState<ParkingOption[]>([]);
  const [parkingId,  setParkingId]  = useState<string>("");

  // Location & delivery state
  const [deliveryEnabled, setDeliveryEnabled]       = useState(false);
  const [deliveryType, setDeliveryType]             = useState<"radius" | "location">("radius");
  const [deliveryRadius, setDeliveryRadius]         = useState("");
  const [deliveryRadiusPrice, setDeliveryRadiusPrice] = useState("");
  const [deliveryLocations, setDeliveryLocations]   = useState<DeliveryLocation[]>([]);
  const [newLocation, setNewLocation]               = useState<SelectedAddress | null>(null);
  const [newLocationLabel, setNewLocationLabel]     = useState("");
  const [newLocationRadius, setNewLocationRadius]   = useState("0.5");
  const [newLocationPrice, setNewLocationPrice]     = useState("");

  // Platform links state
  const [turoLink, setTuroLink]           = useState("");
  const [getaroundLink, setGetaroundLink] = useState("");

  // Load available parkings for the select dropdown
  useEffect(() => {
    fetch("/next-api/parkings?isActive=true")
      .then(r => r.ok ? r.json() : [])
      .then((list: ParkingOption[]) => setParkings(list))
      .catch(() => {});
  }, []);

  // Populate location/delivery/platform links from car
  useEffect(() => {
    if (car) {
      setParkingId((car as any).parkingId ?? "");
      setDeliveryEnabled(car.deliveryEnabled ?? false);
      setDeliveryType((car.deliveryType as "radius" | "location") ?? "radius");
      setDeliveryRadius(car.deliveryRadiusKm != null ? String(car.deliveryRadiusKm) : "");
      setDeliveryRadiusPrice(car.deliveryRadiusPrice != null ? String(car.deliveryRadiusPrice) : "");
      setTuroLink(car.turoLink ?? "");
      setGetaroundLink(car.getaroundLink ?? "");
    }
  }, [car]);

  // Load existing delivery locations when editing
  useEffect(() => {
    if (!car?.id) return;
    fetch(`/next-api/cars/${car.id}/delivery-locations`)
      .then(r => r.ok ? r.json() : [])
      .then((locs: DeliveryLocation[]) => setDeliveryLocations(locs))
      .catch(() => {});
  }, [car?.id]);

  // Populate FR fields
  useEffect(() => {
    if (car) {
      setForm({
        name:             car.name,
        immatriculation:  car.immatriculation,
        phoneNumber:      car.phoneNumber,
        description:      car.description ?? "",
        brand:            car.brand ?? "",
        model:            car.model ?? "",
        finishing:        car.finishing ?? "",
        modelYear:        car.modelYear != null ? String(car.modelYear) : "",
        color:            car.color ?? "",
        vehicleType:      car.vehicleType ?? "",
        energy:           car.energy ?? "",
        gearbox:          car.gearbox ?? "",
        din:              car.din != null ? String(car.din) : "",
        mileage:          car.mileage ?? "",
        numberOfDoors:    car.numberOfDoors    != null ? String(car.numberOfDoors)    : "",
        numberOfSeats:    car.numberOfSeats    != null ? String(car.numberOfSeats)    : "",
        vehicleCondition: car.vehicleCondition ?? "",
        basePricePerDay:        car.basePricePerDay        != null ? String(car.basePricePerDay)        : "",
        basePricePerWeekendDay: car.basePricePerWeekendDay != null ? String(car.basePricePerWeekendDay) : "",
      });
    }
  }, [car]);

  // Load EN translations
  useEffect(() => {
    if (!car?.id) return;
    fetch(`/next-api/translations/car/${car.id}?lang=en`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { id: string; field: string; value: string }[]) => {
        const values: EnTranslations = { ...EMPTY_EN };
        const ids: EnTranslationIds  = {};
        for (const row of rows) {
          if ((TRANSLATABLE_FIELDS as readonly string[]).includes(row.field)) {
            values[row.field as TranslatableField] = row.value;
            ids[row.field as TranslatableField]    = row.id;
          }
        }
        setEnTranslations(values);
        setEnTranslationIds(ids);
      })
      .catch(() => {});
  }, [car?.id]);

  const set = (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setEn = (field: TranslatableField) => (val: string) =>
    setEnTranslations((prev) => ({ ...prev, [field]: val }));

  const addLocation = () => {
    if (!newLocation || deliveryLocations.length >= MAX_LOCATIONS) return;
    setDeliveryLocations(prev => [...prev, {
      label:    newLocationLabel.trim() || newLocation.label,
      address:  newLocation.label,
      lat:      newLocation.lat,
      lng:      newLocation.lng,
      radiusKm: Number(newLocationRadius) || 0.5,
      price:    newLocationPrice !== "" ? Number(newLocationPrice) : null,
    }]);
    setNewLocation(null);
    setNewLocationLabel("");
    setNewLocationRadius("0.5");
    setNewLocationPrice("");
  };

  const removeLocation = (index: number) => {
    setDeliveryLocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        name:             form.name,
        immatriculation:  form.immatriculation,
        phoneNumber:      form.phoneNumber,
        description:      form.description      || null,
        brand:            form.brand            || null,
        model:            form.model            || null,
        finishing:        form.finishing        || null,
        modelYear:        form.modelYear        ? Number(form.modelYear)     : null,
        color:            form.color            || null,
        vehicleType:      form.vehicleType      || null,
        energy:           form.energy           || null,
        gearbox:          form.gearbox          || null,
        din:              form.din              ? Number(form.din)           : null,
        mileage:          form.mileage          || null,
        numberOfDoors:    form.numberOfDoors    ? Number(form.numberOfDoors)    : null,
        numberOfSeats:    form.numberOfSeats    ? Number(form.numberOfSeats)    : null,
        vehicleCondition: form.vehicleCondition || null,
        basePricePerDay:        Number(form.basePricePerDay),
        basePricePerWeekendDay: form.basePricePerWeekendDay ? Number(form.basePricePerWeekendDay) : null,
        parkingId:        parkingId || null,
        deliveryEnabled,
        deliveryType:        deliveryEnabled ? deliveryType : null,
        deliveryRadiusKm:    deliveryEnabled && deliveryType === "radius" && deliveryRadius ? Number(deliveryRadius) : null,
        deliveryRadiusPrice: deliveryEnabled && deliveryType === "radius" && deliveryRadiusPrice !== "" ? Number(deliveryRadiusPrice) : null,
        deliveryLocations: deliveryEnabled && deliveryType === "location"
          ? deliveryLocations.map(({ id: _id, ...l }) => l)
          : [],
        turoLink:       turoLink.trim()      || null,
        getaroundLink:  getaroundLink.trim() || null,
      };

      const url = isEdit ? `/next-api/cars/${car.id}` : "/next-api/cars";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const savedCar: Car = await res.json();

      // Handle EN translations
      const toUpsert: { entityType: string; entityId: string; field: string; value: string; lang: string }[] = [];
      const toDelete: string[] = [];
      for (const field of TRANSLATABLE_FIELDS) {
        const val = enTranslations[field].trim();
        if (val) {
          toUpsert.push({ entityType: "car", entityId: savedCar.id, field, value: val, lang: "en" });
        } else if (enTranslationIds[field]) {
          toDelete.push(enTranslationIds[field]!);
        }
      }
      await Promise.all([
        toUpsert.length
          ? fetch("/next-api/translations/bulk", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: toUpsert }),
            })
          : null,
        ...toDelete.map((id) => fetch(`/next-api/translations/entry/${id}`, { method: "DELETE" })),
      ].filter(Boolean));

      onSaved(savedCar);
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

          {/* ── Identity ── */}
          <p className={styles.section}>Identity</p>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input className={styles.input} value={form.name} onChange={set("name")} placeholder="Peugeot 208" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Plate</label>
            <input className={styles.input} value={form.immatriculation} onChange={set("immatriculation")} placeholder="AB-123-CD" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone number</label>
            <input className={styles.input} type="tel" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+33600000000" required />
          </div>
          <BilingualField
            label="Description"
            frValue={form.description}
            frOnChange={(v) => setForm((p) => ({ ...p, description: v }))}
            frPlaceholder="Notes sur le véhicule…"
            enValue={enTranslations.description}
            enOnChange={setEn("description")}
            enPlaceholder="Notes about the vehicle…"
            multiline rows={2}
          />

          {/* ── Vehicle ── */}
          <p className={styles.section}>Vehicle</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Brand <span className={styles.required}>*</span></label>
              <input className={styles.input} value={form.brand} onChange={set("brand")} placeholder="Peugeot" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Model <span className={styles.required}>*</span></label>
              <input className={styles.input} value={form.model} onChange={set("model")} placeholder="208" required />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Finishing <span className={styles.required}>*</span></label>
              <input className={styles.input} value={form.finishing} onChange={set("finishing")} placeholder="GT Line" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Model year <span className={styles.required}>*</span></label>
              <input className={styles.input} type="number" min="1900" max="2030" value={form.modelYear} onChange={set("modelYear")} placeholder="2022" required />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Vehicle type</label>
            <select className={styles.select} value={form.vehicleType} onChange={set("vehicleType")}>
              <option value="">— select —</option>
              {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <BilingualField
            label="Color"
            frValue={form.color}
            frOnChange={(v) => setForm((p) => ({ ...p, color: v }))}
            frPlaceholder="Blanc"
            enValue={enTranslations.color}
            enOnChange={setEn("color")}
            enPlaceholder="White"
            frRequired
          />

          {/* ── Technical ── */}
          <p className={styles.section}>Technical</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Energy <span className={styles.required}>*</span></label>
              <select className={styles.select} value={form.energy} onChange={set("energy")} required>
                <option value="">— select —</option>
                {ENERGY_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Gearbox <span className={styles.required}>*</span></label>
              <select className={styles.select} value={form.gearbox} onChange={set("gearbox")} required>
                <option value="">— select —</option>
                {GEARBOX_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
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
              {MILEAGE_OPTIONS.map((v) => <option key={v} value={v}>{v} km</option>)}
            </select>
          </div>

          {/* ── Pricing ── */}
          <p className={styles.section}>Pricing</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Base price / day (€) <span className={styles.required}>*</span></label>
              <input className={styles.input} type="number" min="0.01" step="0.01" value={form.basePricePerDay} onChange={set("basePricePerDay")} placeholder="49.00" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Weekend price / day (€)</label>
              <input className={styles.input} type="number" min="0.01" step="0.01" value={form.basePricePerWeekendDay} onChange={set("basePricePerWeekendDay")} placeholder="59.00" />
            </div>
          </div>

          {/* ── Location & Delivery ── */}
          <p className={styles.section}>Location &amp; Delivery</p>

          <div className={styles.field}>
            <label className={styles.label}>Assigned parking slot</label>
            <select
              className={styles.select}
              value={parkingId}
              onChange={e => setParkingId(e.target.value)}
            >
              <option value="">— No parking assigned —</option>
              {parkings.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}{p.city ? ` · ${p.city}` : ""}
                </option>
              ))}
            </select>
            {parkingId && (() => {
              const selected = parkings.find(p => p.id === parkingId);
              return selected ? (
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "4px 0 0 2px" }}>
                  {selected.address}
                  {selected.latitude && selected.longitude
                    ? ` · ${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
                    : ""}
                </p>
              ) : null;
            })()}
            {parkings.length === 0 && (
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "4px 0 0 2px" }}>
                No parking slots created yet —{" "}
                <a href="/admin/parkings" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-admin-secondary)" }}>
                  add one in Parking Management
                </a>
              </p>
            )}
          </div>

          {/* Delivery toggle */}
          <div className={styles.field}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={deliveryEnabled}
                onChange={e => setDeliveryEnabled(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span className={styles.label} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.9rem", margin: 0 }}>
                Enable delivery
              </span>
            </label>
          </div>

          {deliveryEnabled && (
            <>
              {/* Delivery type */}
              <div className={styles.field}>
                <label className={styles.label}>Delivery mode</label>
                <select
                  className={styles.select}
                  value={deliveryType}
                  onChange={e => setDeliveryType(e.target.value as "radius" | "location")}
                >
                  <option value="radius">Radius — deliver within X km of parking</option>
                  <option value="location">Locations — deliver to specific addresses</option>
                </select>
              </div>

              {/* Radius mode */}
              {deliveryType === "radius" && (
                <>
                  <div className={styles.row} style={{ gap: "1rem" }}>
                    <div className={styles.field} style={{ flex: 1 }}>
                      <label className={styles.label}>Delivery radius (km)</label>
                      <input
                        className={styles.input}
                        type="number" min="1" max="200" step="0.5"
                        value={deliveryRadius}
                        onChange={e => setDeliveryRadius(e.target.value)}
                        placeholder="e.g. 20"
                      />
                    </div>
                    <div className={styles.field} style={{ flex: 1 }}>
                      <label className={styles.label}>Delivery fee (€, optional)</label>
                      <input
                        className={styles.input}
                        type="number" min="0" step="0.01"
                        value={deliveryRadiusPrice}
                        onChange={e => setDeliveryRadiusPrice(e.target.value)}
                        placeholder="e.g. 15"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Location mode */}
              {deliveryType === "location" && (
                <div className={styles.field}>
                  <label className={styles.label}>
                    Delivery locations
                    <span style={{ fontWeight: 400, marginLeft: 6, color: "var(--color-text-muted)" }}>
                      ({deliveryLocations.length}/{MAX_LOCATIONS})
                    </span>
                  </label>

                  {/* Existing locations */}
                  {deliveryLocations.map((loc, i) => (
                    <div key={i} className={styles.locationRow}>
                      <span className={styles.locationPin}>📍</span>
                      <div className={styles.locationInfo}>
                        <span className={styles.locationLabel}>{loc.label}</span>
                        <span className={styles.locationAddress}>{loc.address}</span>
                        <span className={styles.locationRadius}>
                          ± {loc.radiusKm} km
                          {loc.price != null ? ` · ${loc.price} €` : " · Free"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.locationRemove}
                        onClick={() => removeLocation(i)}
                        aria-label="Remove location"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Add new location */}
                  {deliveryLocations.length < MAX_LOCATIONS && (
                    <div className={styles.locationAdd}>
                      <div className={styles.field} style={{ margin: 0 }}>
                        <label className={styles.label}>Label</label>
                        <input
                          className={styles.input}
                          value={newLocationLabel}
                          onChange={e => setNewLocationLabel(e.target.value)}
                          placeholder="e.g. Paris centre"
                        />
                      </div>
                      <div className={styles.field} style={{ margin: 0 }}>
                        <label className={styles.label}>Address</label>
                        <AddressAutocomplete
                          value={newLocation}
                          onChange={setNewLocation}
                          placeholder="Search address…"
                        />
                      </div>
                      <div className={styles.row} style={{ margin: 0, gap: "0.75rem" }}>
                        <div className={styles.field} style={{ flex: 1 }}>
                          <label className={styles.label}>Match radius (km)</label>
                          <input
                            className={styles.input}
                            type="number" min="0.1" max="50" step="0.1"
                            value={newLocationRadius}
                            onChange={e => setNewLocationRadius(e.target.value)}
                          />
                        </div>
                        <div className={styles.field} style={{ flex: 1 }}>
                          <label className={styles.label}>Fee (€, optional)</label>
                          <input
                            className={styles.input}
                            type="number" min="0" step="0.01"
                            value={newLocationPrice}
                            onChange={e => setNewLocationPrice(e.target.value)}
                            placeholder="Free"
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                          <button
                            type="button"
                            className={styles.addLocationBtn}
                            onClick={addLocation}
                            disabled={!newLocation}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Platform Links ── */}
          <p className={styles.section}>Platform Links</p>
          <div className={styles.field}>
            <label className={styles.label}>Turo listing URL</label>
            <input
              className={styles.input}
              type="url"
              value={turoLink}
              onChange={e => setTuroLink(e.target.value)}
              placeholder="https://turo.com/us/en/car-rental/…"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Getaround listing URL</label>
            <input
              className={styles.input}
              type="url"
              value={getaroundLink}
              onChange={e => setGetaroundLink(e.target.value)}
              placeholder="https://getaround.com/cars/…"
            />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "-0.25rem 0 0", lineHeight: 1.45 }}>
            If set, these appear as secondary booking options on the public vehicle page. Leave empty to hide the platform.
          </p>

          {/* ── Details ── */}
          <p className={styles.section}>Details</p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Doors <span className={styles.required}>*</span></label>
              <input className={styles.input} type="number" min="2" max="6" value={form.numberOfDoors} onChange={set("numberOfDoors")} placeholder="5" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Seats <span className={styles.required}>*</span></label>
              <input className={styles.input} type="number" min="1" max="9" value={form.numberOfSeats} onChange={set("numberOfSeats")} placeholder="5" required />
            </div>
          </div>
          <BilingualField
            label="Vehicle condition"
            frValue={form.vehicleCondition}
            frOnChange={(v) => setForm((p) => ({ ...p, vehicleCondition: v }))}
            frPlaceholder="ex. Bon état, légères rayures sur le pare-chocs arrière"
            enValue={enTranslations.vehicleCondition}
            enOnChange={setEn("vehicleCondition")}
            enPlaceholder="e.g. Good, minor scratches on rear bumper"
          />

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

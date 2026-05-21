"use client";

import { useEffect, useState } from "react";
import styles from "./ParkingDetailPanel.module.css";
import type { Parking } from "./ParkingList";

interface Props {
  parkingId: string;
  onClose: () => void;
  onEdit: (p: Parking) => void;
}

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e", inactive: "#94a3b8", maintenance: "#f59e0b", blocked: "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Active", inactive: "Inactive", maintenance: "Maintenance", blocked: "Blocked",
};
const TYPE_LABEL: Record<string, string> = {
  covered: "Covered", outdoor: "Outdoor", underground: "Underground",
  garage: "Garage", street: "Street", other: "Other",
};

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n));
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className={styles.copyBtn} onClick={copy} title="Copy">
      <span className="material-symbols-outlined">{copied ? "check" : "content_copy"}</span>
    </button>
  );
}

export default function ParkingDetailPanel({ parkingId, onClose, onEdit }: Props) {
  const [parking, setParking] = useState<(Parking & { cars?: Array<{ id: string; name: string; immatriculation: string; photo: string | null }> }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/next-api/parkings/${parkingId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setParking(d); setLoading(false); });
  }, [parkingId]);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            {loading ? (
              <div className={styles.loadingTitle}>Loading…</div>
            ) : parking ? (
              <>
                <h2 className={styles.panelTitle}>{parking.label}</h2>
                <p className={styles.panelAddress}>{parking.address}</p>
              </>
            ) : (
              <div className={styles.loadingTitle}>Not found</div>
            )}
          </div>
          <div className={styles.panelHeaderActions}>
            {parking && (
              <button className={styles.editBtn} onClick={() => onEdit(parking)}>
                <span className="material-symbols-outlined">edit</span> Edit
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {parking && (
          <div className={styles.panelBody}>

            {/* ── Status ── */}
            <div className={styles.statusRow}>
              <span className={styles.statusBadge} style={{ background: (STATUS_COLOR[parking.status] ?? "#94a3b8") + "20", color: STATUS_COLOR[parking.status] ?? "#94a3b8" }}>
                {STATUS_LABEL[parking.status] ?? parking.status}
              </span>
              {parking.parkingType && (
                <span className={styles.typeBadge}>{TYPE_LABEL[parking.parkingType] ?? parking.parkingType}</span>
              )}
              {!parking.isActive && <span className={styles.inactiveBadge}>Inactive</span>}
            </div>

            {/* ── Financial ── */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Financial</div>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Monthly rent</span>
                  <span className={styles.infoValue} style={{ color: "#ef4444", fontWeight: 700 }}>{fmtEur(parking.monthlyRentEur)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Deposit</span>
                  <span className={styles.infoValue} style={{ color: "#f59e0b" }}>{fmtEur(parking.cautionEur)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Payment due</span>
                  <span className={styles.infoValue}>{parking.paymentDueDay ? `Day ${parking.paymentDueDay}` : "—"}</span>
                </div>
              </div>
            </div>

            {/* ── Owner ── */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Owner</div>
              {parking.ownerName && <div className={styles.ownerName}>{parking.ownerName}</div>}
              {parking.ownerPhones.length > 0 ? (
                <div className={styles.phoneList}>
                  {parking.ownerPhones.map(ph => (
                    <div key={ph.id} className={styles.phoneItem}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#64748b" }}>phone</span>
                      <a href={`tel:${ph.phoneNumber}`} className={styles.phoneLink}>{ph.phoneNumber}</a>
                      {ph.label && <span className={styles.phoneLabel}>{ph.label}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyNote}>No phone numbers on file</p>
              )}
            </div>

            {/* ── Access ── */}
            {(parking.pedestrianCode || parking.gateCode || parking.accessInstructions) && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Access</div>
                {parking.pedestrianCode && (
                  <div className={styles.codeItem}>
                    <span className={styles.infoLabel}>Pedestrian code</span>
                    <div className={styles.codeValue}>
                      <code className={styles.code}>{parking.pedestrianCode}</code>
                      <CopyButton value={parking.pedestrianCode} />
                    </div>
                  </div>
                )}
                {parking.gateCode && (
                  <div className={styles.codeItem}>
                    <span className={styles.infoLabel}>Gate code</span>
                    <div className={styles.codeValue}>
                      <code className={styles.code}>{parking.gateCode}</code>
                      <CopyButton value={parking.gateCode} />
                    </div>
                  </div>
                )}
                {parking.accessInstructions && (
                  <div className={styles.field}>
                    <span className={styles.infoLabel}>Access instructions</span>
                    <pre className={styles.pre}>{parking.accessInstructions}</pre>
                  </div>
                )}
              </div>
            )}

            {/* ── Constraints ── */}
            {parking.dimensionNotes && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Constraints / Dimensions</div>
                <pre className={styles.pre}>{parking.dimensionNotes}</pre>
              </div>
            )}

            {/* ── Comments ── */}
            {parking.comments && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Operational comments</div>
                <pre className={styles.pre}>{parking.comments}</pre>
              </div>
            )}

            {/* ── Assigned vehicles ── */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                Assigned vehicles ({parking.cars?.length ?? 0})
              </div>
              {parking.cars && parking.cars.length > 0 ? (
                <div className={styles.carList}>
                  {parking.cars.map(car => (
                    <div key={car.id} className={styles.carItem}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#64748b" }}>directions_car</span>
                      <div>
                        <div className={styles.carName}>{car.name}</div>
                        <div className={styles.carPlate}>{car.immatriculation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyNote} style={{ color: "#f59e0b" }}>
                  No vehicles assigned — slot is unused
                </p>
              )}
            </div>

            {/* ── GPS ── */}
            {(parking.latitude && parking.longitude) && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Location</div>
                <div className={styles.gpsRow}>
                  <span className={styles.infoLabel}>GPS</span>
                  <code className={styles.gpsCode}>{parking.latitude.toFixed(6)}, {parking.longitude.toFixed(6)}</code>
                  <a
                    href={`https://www.google.com/maps?q=${parking.latitude},${parking.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mapsLink}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                    Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import styles from "./ParkingMap.module.css";
import type { Parking } from "./ParkingList";

interface Props {
  parkings: Parking[];
  onSelect?: (id: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e", inactive: "#94a3b8", maintenance: "#f59e0b", blocked: "#ef4444",
};

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n));
}

export default function ParkingMap({ parkings, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<any[]>([]);

  // ── Init map ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then(({ default: L }) => {
      const map = L.map(containerRef.current!, {
        center: [46.6, 2.3],
        zoom: 6,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
        maxZoom: 18,
      }).addTo(map);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Render markers ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => renderMarkers(), 100);
    return () => clearTimeout(timer);
  }, [parkings, onSelect]);

  const renderMarkers = () => {
    import("leaflet").then(({ default: L }) => {
      if (!mapRef.current) return;

      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const geolocated = parkings.filter(p => p.latitude && p.longitude);
      if (geolocated.length === 0) return;

      const bounds: [number, number][] = [];

      geolocated.forEach(p => {
        const color  = STATUS_COLOR[p.status] ?? "#94a3b8";
        const isOcc  = p.cars && p.cars.length > 0;

        const icon = L.divIcon({
          html: `
            <div style="
              position:relative;
              width:32px;height:38px;
            ">
              <div style="
                position:absolute;bottom:0;left:50%;transform:translateX(-50%);
                width:32px;height:32px;
                background:${color};
                border:2.5px solid #fff;
                border-radius:50% 50% 50% 0;
                transform:translateX(-50%) rotate(-45deg);
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
              "></div>
              <div style="
                position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
                width:14px;height:14px;
                background:#fff;
                border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                font-size:8px;font-weight:700;color:${color};
              ">${isOcc ? (p.cars?.length ?? "") : "P"}</div>
            </div>
          `,
          className: "",
          iconSize:   [32, 38],
          iconAnchor: [16, 38],
          popupAnchor: [0, -38],
        });

        const popup = L.popup({ maxWidth: 280 }).setContent(`
          <div style="font-family:system-ui,sans-serif;min-width:220px;">
            <div style="font-size:14px;font-weight:700;color:#001829;margin-bottom:4px;">${p.label}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:8px;">${p.address}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
              <div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Loyer</div><div style="font-weight:700;color:#ef4444;font-size:13px;">${fmtEur(p.monthlyRentEur)}</div></div>
              <div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Véhicules</div><div style="font-weight:700;color:#001829;font-size:13px;">${p.cars?.length ?? 0}</div></div>
            </div>
            ${p.ownerName ? `<div style="font-size:12px;color:#334155;">👤 ${p.ownerName}</div>` : ""}
            <button
              onclick="document.dispatchEvent(new CustomEvent('parking-select',{detail:'${p.id}'}))"
              style="margin-top:8px;width:100%;padding:6px 0;background:#001829;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;"
            >
              Voir les détails
            </button>
          </div>
        `);

        const marker = L.marker([p.latitude!, p.longitude!], { icon }).bindPopup(popup);
        marker.addTo(mapRef.current);
        markersRef.current.push(marker);
        bounds.push([p.latitude!, p.longitude!]);
      });

      if (bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });
  };

  // ── Listen for popup button clicks ────────────────────────────────────────

  useEffect(() => {
    if (!onSelect) return;
    const handler = (e: Event) => onSelect((e as CustomEvent<string>).detail);
    document.addEventListener("parking-select", handler);
    return () => document.removeEventListener("parking-select", handler);
  }, [onSelect]);

  const withCoords = parkings.filter(p => p.latitude && p.longitude).length;
  const noCoords   = parkings.length - withCoords;

  return (
    <div className={styles.mapContainer}>
      <div ref={containerRef} className={styles.map} />
      <div className={styles.legend}>
        <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#22c55e" }} /> Actif</div>
        <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#f59e0b" }} /> Maintenance</div>
        <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#ef4444" }} /> Bloqué</div>
        <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#94a3b8" }} /> Inactif</div>
        {noCoords > 0 && (
          <div className={styles.legendItem} style={{ marginLeft: 12, color: "#94a3b8" }}>
            {noCoords} sans coordonnées
          </div>
        )}
      </div>
    </div>
  );
}

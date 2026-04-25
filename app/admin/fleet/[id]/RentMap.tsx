"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface RentPosition {
  id: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

interface Props {
  positions: RentPosition[];
  height?: number;
  fill?: boolean;
}

export default function RentMap({ positions, height = 280, fill = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || positions.length === 0) return;

    import("leaflet").then(({ default: L }) => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current!, { zoomControl: true });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
        maxZoom: 18,
      }).addTo(map);

      const latlngs: [number, number][] = positions.map((p) => [p.lat, p.lng]);

      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: "#407bff", weight: 2.5, opacity: 0.75 }).addTo(map);
      }

      positions.forEach((pos, i) => {
        const isFirst = i === 0;
        const isLast  = i === positions.length - 1;
        const bg = isFirst ? "#22c55e" : isLast ? "#ef4444" : "#211951";

        const icon = L.divIcon({
          html: `<div style="
            background:${bg};color:#fff;width:26px;height:26px;
            border-radius:50%;display:flex;align-items:center;
            justify-content:center;font-size:11px;font-weight:700;
            border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35);
            ">${i + 1}</div>`,
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const popup = L.popup({ offset: [0, -10] }).setContent(
          `<b>#${i + 1}</b><br/>${new Date(pos.recordedAt).toLocaleString()}<br/><a href="https://www.google.com/maps?q=${pos.lat},${pos.lng}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>`
        );

        L.marker([pos.lat, pos.lng], { icon }).bindPopup(popup).addTo(map);
      });

      if (latlngs.length === 1) {
        map.setView(latlngs[0], 15);
      } else {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: fill ? "100%" : `${height}px`,
        borderRadius: fill ? 0 : "10px",
        overflow: "hidden",
      }}
    />
  );
}

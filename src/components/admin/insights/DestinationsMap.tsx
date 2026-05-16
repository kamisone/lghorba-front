"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import styles from "./DestinationsMap.module.css";

interface HeatmapPoint {
  id:       string;
  lat:      number;
  lng:      number;
  weight:   number;
  category: string | null;
}

interface Props {
  category?:      string;
  minConfidence?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  tourism:       "#8b5cf6",
  shopping:      "#f59e0b",
  dining:        "#ef4444",
  beach:         "#06b6d4",
  nature:        "#22c55e",
  airport:       "#3b82f6",
  transport:     "#6366f1",
  healthcare:    "#ec4899",
  accommodation: "#f97316",
  services:      "#64748b",
  other:         "#94a3b8",
};

function categoryColor(cat: string | null): string {
  return cat ? (CATEGORY_COLORS[cat] ?? "#94a3b8") : "#94a3b8";
}

export default function DestinationsMap({ category, minConfidence }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const layerRef     = useRef<any>(null);

  const [points,   setPoints]   = useState<HeatmapPoint[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [heatmode, setHeatmode] = useState(false);

  // ── Fetch heatmap data ─────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    if (minConfidence)                  params.set("minConfidence", String(minConfidence));

    fetch(`/next-api/insights/destinations/heatmap?${params.toString()}`)
      .then(r => r.json())
      .then((data: HeatmapPoint[]) => setPoints(Array.isArray(data) ? data : []))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [category, minConfidence]);

  // ── Init Leaflet map ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    import("leaflet").then(({ default: L }) => {
      if (mapRef.current) return; // already initialized

      const map = L.map(containerRef.current!, {
        center: [46.6, 2.3], // France center
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

  // ── Render markers / heatmap ───────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || loading) return;

    import("leaflet").then(({ default: L }) => {
      // Remove previous layer group
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }

      if (points.length === 0) return;

      const group = L.layerGroup();

      if (heatmode) {
        // Simple heatmap simulation using translucent circles
        points.forEach(p => {
          const radius = 20_000 * p.weight + 2_000; // metres
          L.circle([p.lat, p.lng], {
            radius,
            color:       "transparent",
            fillColor:   categoryColor(p.category),
            fillOpacity: Math.max(0.1, p.weight * 0.5),
            weight:      0,
          }).addTo(group);
        });
      } else {
        points.forEach(p => {
          const color  = categoryColor(p.category);
          const size   = Math.max(8, Math.round(14 * p.weight + 6));

          const icon = L.divIcon({
            html: `<div style="
              width:${size}px;height:${size}px;
              background:${color};
              border:2px solid #fff;
              border-radius:50%;
              box-shadow:0 1px 4px rgba(0,0,0,0.3);
              opacity:${0.6 + p.weight * 0.4};
            "></div>`,
            className: "",
            iconSize:   [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const popup = L.popup({ offset: [0, -size / 2] }).setContent(
            `<div style="font-size:13px;line-height:1.6">
              <a href="/admin/insights/destinations/${p.id}" target="_blank" style="font-weight:600;color:#001829;text-decoration:none">
                Open detail ↗
              </a><br/>
              <span style="color:#64748b;font-size:11px;text-transform:capitalize">${p.category ?? "Unknown category"}</span>
            </div>`
          );

          L.marker([p.lat, p.lng], { icon })
            .bindPopup(popup)
            .addTo(group);
        });
      }

      group.addTo(mapRef.current!);
      layerRef.current = group;

      // Auto-fit if we have data
      if (points.length > 0) {
        const latlngs = points.map(p => [p.lat, p.lng] as [number, number]);
        mapRef.current!.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24], maxZoom: 14 });
      }
    });
  }, [points, heatmode, loading]);

  // ── Legend ─────────────────────────────────────────────────────────────────

  const presentCategories = Array.from(new Set(points.map(p => p.category).filter(Boolean))) as string[];

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <span className={styles.count}>{points.length} destination{points.length !== 1 ? "s" : ""}</span>
        <label className={styles.heatToggle}>
          <input type="checkbox" checked={heatmode} onChange={e => setHeatmode(e.target.checked)} />
          Heatmap mode
        </label>
      </div>

      <div className={styles.mapContainer}>
        {loading && <div className={styles.loadingOverlay}>Loading…</div>}
        <div ref={containerRef} className={styles.map} />
      </div>

      {presentCategories.length > 0 && (
        <div className={styles.legend}>
          {presentCategories.map(cat => (
            <span key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: categoryColor(cat) }} />
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

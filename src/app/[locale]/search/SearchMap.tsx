"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import styles from "./SearchMap.module.css";

export interface MapCar {
  id:              string;
  name:            string;
  hasPhoto:        boolean;
  basePricePerDay: number | null;
  parkingLat:      number;
  parkingLng:      number;
  distanceKm:      number | null;
}

interface MapLabels {
  openDetails: string;
  perDay:      string;
  totalLabel:  string;
  showMap:     string;
}

interface Props {
  cars:          MapCar[];
  hoveredCarId:  string | null;
  selectedCarId: string | null;
  start:         string;
  end:           string;
  locale:        string;
  labels:        MapLabels;
  visible?:      boolean; // true when the mobile overlay is open
  onMarkerHover: (id: string | null) => void;
  onMarkerClick: (id: string) => void;
  onMapClick:    () => void;
}

// ── Icon factories (inline styles — CSS vars unavailable in Leaflet DivIcon HTML) ──

function makeIcon(L: any, price: string | null, active: boolean) {
  const label = price ?? "●";
  const bg     = active ? "#8DC220" : "#00466E";
  const fg     = active ? "#001829" : "#ffffff";
  const size   = active ? "13px"    : "12px";
  const weight = active ? "800"     : "700";
  const shadow = active
    ? "0 3px 14px rgba(0,0,0,.38), 0 0 0 3px rgba(141,194,32,.45)"
    : "0 2px 6px rgba(0,0,0,.26)";
  const pad    = active ? "6px 12px" : "5px 10px";

  // translate(-50%,-100%): pill's bottom-center sits exactly on the lat/lng point,
  // width adapts to content — no hardcoded size that misaligns the popup.
  return L.divIcon({
    html: `<div style="
      display:inline-flex;align-items:center;justify-content:center;
      background:${bg};color:${fg};
      padding:${pad};border-radius:20px;
      font-size:${size};font-weight:${weight};
      white-space:nowrap;border:2px solid #fff;
      box-shadow:${shadow};cursor:pointer;
      font-family:system-ui,-apple-system,sans-serif;
      letter-spacing:-0.01em;line-height:1;
      transform:translate(-50%,-100%);
    ">${label}</div>`,
    className: "",
    iconSize:   [1, 1],   // minimal — lets the inner div size itself naturally
    iconAnchor: [0, 0],   // anchor = top-left of 1×1 box = the lat/lng point
    popupAnchor:[0, -32], // popup tip ~32 px above the anchor (≈ above pill top)
  });
}

// ── Popup HTML builder ────────────────────────────────────────────────────────

function makePopup(car: MapCar, labels: MapLabels, locale: string, start: string, end: string): string {
  const detailHref = `/${locale}/fleet/${car.id}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const priceHtml  = car.basePricePerDay != null
    ? `<span style="color:#00466E;font-size:1rem;font-weight:800;">€${car.basePricePerDay}</span>
       <span style="color:#64748b;font-size:.75rem;margin-left:2px;">/ ${labels.perDay}</span>`
    : "";
  const imgHtml = car.hasPhoto
    ? `<img src="/next-api/public/cars/${car.id}/photo"
         style="width:100%;height:100%;object-fit:cover;display:block;"
         loading="lazy"
         onerror="this.style.display='none';this.parentElement.innerHTML='<div style=&quot;height:100%;display:flex;align-items:center;justify-content:center;font-size:2.2rem;&quot;>🚗</div>'">`
    : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:2.2rem;">🚗</div>`;

  return `
    <div style="width:190px;font-family:system-ui,-apple-system,sans-serif;padding:2px">
      <div style="height:108px;background:#f1f5f9;border-radius:8px;overflow:hidden;margin-bottom:10px">
        ${imgHtml}
      </div>
      <div style="font-weight:700;font-size:.87rem;color:#1e293b;margin-bottom:5px;line-height:1.3;">
        ${car.name}
      </div>
      ${priceHtml ? `<div style="margin-bottom:10px;">${priceHtml}</div>` : `<div style="margin-bottom:10px;"></div>`}
      <a href="${detailHref}"
         style="display:block;text-align:center;background:#00466E;color:#fff;
                padding:8px 10px;border-radius:8px;text-decoration:none;
                font-size:.8rem;font-weight:700;
                font-family:system-ui,-apple-system,sans-serif;" target="_blank">
        ${labels.openDetails} →
      </a>
    </div>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchMap({
  cars,
  hoveredCarId,
  selectedCarId,
  start,
  end,
  locale,
  labels,
  visible,
  onMarkerHover,
  onMarkerClick,
  onMapClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const lRef         = useRef<any>(null);
  const markersRef   = useRef<Map<string, any>>(new Map());
  const carsRef      = useRef<MapCar[]>([]);
  const prevActiveRef= useRef<string | null>(null);
  // Keep latest callbacks in refs so Leaflet event handlers never go stale
  const onHoverRef   = useRef(onMarkerHover);
  const onClickRef   = useRef(onMarkerClick);
  const onMapRef     = useRef(onMapClick);
  onHoverRef.current = onMarkerHover;
  onClickRef.current = onMarkerClick;
  onMapRef.current   = onMapClick;

  // ── Helper: clear all markers ─────────────────────────────────────────────

  function clearMarkers() {
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();
  }

  // ── Helper: draw markers for a car list ──────────────────────────────────

  function drawMarkers(L: any, map: any, list: MapCar[]) {
    clearMarkers();

    const validCars = list.filter(c => c.parkingLat != null && c.parkingLng != null);
    const active    = prevActiveRef.current;

    validCars.forEach(car => {
      const isActive  = car.id === active;
      const priceStr  = car.basePricePerDay != null ? `€${car.basePricePerDay}` : null;
      const icon      = makeIcon(L, priceStr, isActive);
      const popup     = L.popup({ closeButton: true, maxWidth: 210 })
                         .setContent(makePopup(car, labels, locale, start, end));

      const marker = L.marker([car.parkingLat, car.parkingLng], { icon, title: car.name })
        .bindPopup(popup)
        .addTo(map);

      marker.on("mouseover", () => onHoverRef.current(car.id));
      marker.on("mouseout",  () => onHoverRef.current(null));
      marker.on("click",     () => {
        onClickRef.current(car.id);
        marker.openPopup();
      });

      markersRef.current.set(car.id, marker);
    });

    // Fit map to markers
    if (validCars.length === 1) {
      map.setView([validCars[0].parkingLat, validCars[0].parkingLng], 14, { animate: true });
    } else if (validCars.length > 1) {
      const bounds = L.latLngBounds(validCars.map(c => [c.parkingLat, c.parkingLng]));
      map.fitBounds(bounds, { padding: [48, 48], animate: true, maxZoom: 14 });
    }
  }

  // ── Init map (once) ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      lRef.current = L;

      const map = L.map(containerRef.current, {
        zoomControl:        false,
        scrollWheelZoom:    true,
        attributionControl: false,
        closePopupOnClick:  false, // we close it explicitly on background click only
      });
      mapRef.current = map;

      L.control.zoom({ position: "topright" }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Default: France
      map.setView([46.6, 2.3], 6);

      map.on("click", () => {
        map.closePopup();
        onMapRef.current();
      });

      // ResizeObserver set up here (after map exists) so it's never missed
      ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
      ro.observe(containerRef.current);

      // Invalidate after a tick in case the container was already visible
      setTimeout(() => map.invalidateSize(), 80);

      // Draw markers with the latest cars snapshot
      drawMarkers(L, map, carsRef.current);
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        lRef.current   = null;
        markersRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rebuild markers when cars change ─────────────────────────────────────

  useEffect(() => {
    carsRef.current = cars;
    if (!lRef.current || !mapRef.current) return;
    drawMarkers(lRef.current, mapRef.current, cars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars]);

  // ── Update active marker icon without full redraw ─────────────────────────

  useEffect(() => {
    const L       = lRef.current;
    const current = selectedCarId ?? hoveredCarId;
    const prev    = prevActiveRef.current;
    if (!L || current === prev) return;

    // Deactivate previous
    if (prev) {
      const marker = markersRef.current.get(prev);
      const car    = carsRef.current.find(c => c.id === prev);
      if (marker && car) {
        const priceStr = car.basePricePerDay != null ? `€${car.basePricePerDay}` : null;
        marker.setIcon(makeIcon(L, priceStr, false));
        marker.setZIndexOffset(0);
      }
    }
    // Activate current
    if (current) {
      const marker = markersRef.current.get(current);
      const car    = carsRef.current.find(c => c.id === current);
      if (marker && car) {
        const priceStr = car.basePricePerDay != null ? `€${car.basePricePerDay}` : null;
        marker.setIcon(makeIcon(L, priceStr, true));
        marker.setZIndexOffset(1000);
      }
    }
    prevActiveRef.current = current;
  }, [hoveredCarId, selectedCarId]);

  // ── Invalidate size when the mobile overlay becomes visible ─────────────

  useEffect(() => {
    if (!visible) return;
    // Wait for the CSS display change + any transition to complete
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 120);
    return () => clearTimeout(id);
  }, [visible]);

  return <div ref={containerRef} className={styles.mapContainer} />;
}

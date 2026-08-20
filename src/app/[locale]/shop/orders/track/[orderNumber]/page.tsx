"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package, Truck, CheckCircle2, Clock, MapPin, ArrowLeft } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import styles from "../track.module.css";

interface TrackingItem {
  title: string;
  sku: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  options: Array<{ attributeName: string; value: string }> | null;
}

interface ShippingInfo {
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  estimatedDeliveryAt: string | null;
}

interface TimelineEntry {
  status: string;
  date: string;
  note: string | null;
}

interface OrderTracking {
  orderNumber: string;
  status: string;
  customerName: string | null;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  couponCode: string | null;
  createdAt: string;
  items: TrackingItem[];
  shipping: ShippingInfo | null;
  timeline: TimelineEntry[];
}

const STATUS_ORDER = ["paid", "processing", "shipped", "delivered"] as const;

function centsToEuros(c: number) { return (c / 100).toFixed(2); }

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "paid":       return <CheckCircle2 size={18} strokeWidth={2} />;
    case "processing": return <Clock size={18} strokeWidth={2} />;
    case "shipped":    return <Truck size={18} strokeWidth={2} />;
    case "delivered":  return <MapPin size={18} strokeWidth={2} />;
    default:           return <Package size={18} strokeWidth={2} />;
  }
}

export default function OrderTrackDetailPage({ params }: { params: { locale: string; orderNumber: string } }) {
  const t = getTranslations(params.locale).shop;
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    const qs = new URLSearchParams();
    if (token) qs.set("token", token);
    if (email) qs.set("email", email);
    if (params.locale !== "fr") qs.set("lang", params.locale);

    fetch(`/next-api/public/shop/orders/${encodeURIComponent(params.orderNumber)}/track?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setOrder(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.orderNumber, params.locale, token, email]);

  if (loading) return <div className={styles.page}><div className={styles.card}><p style={{ textAlign: "center", padding: 40 }}>...</p></div></div>;
  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.error}>{t.trackOrderNotFound}</p>
          <Link href={`/${params.locale}/shop/orders/track`} className={styles.backLink}>
            <ArrowLeft size={15} /> {t.trackOrderTitle}
          </Link>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status as typeof STATUS_ORDER[number]);
  const timelineLabels: Record<string, string> = {
    paid:       t.trackTimelinePaid,
    processing: t.trackTimelinePreparing,
    shipped:    t.trackTimelineShipped,
    delivered:  t.trackTimelineDelivered,
  };

  const stepDateMap = new Map<string, string>();
  for (const entry of order.timeline) {
    if (!stepDateMap.has(entry.status)) {
      stepDateMap.set(entry.status, entry.date);
    }
  }

  const statusLabel: Record<string, string> = {
    draft: "Draft", pending: "Pending", awaiting_payment: "Awaiting payment",
    paid: t.trackTimelinePaid, processing: t.trackTimelinePreparing,
    shipped: t.trackTimelineShipped, delivered: t.trackTimelineDelivered,
    cancelled: "Cancelled", refunded: "Refunded",
  };

  return (
    <div className={styles.page}>
      <Link href={`/${params.locale}/shop/orders/track`} className={styles.backLink}>
        <ArrowLeft size={15} /> {t.trackOrderTitle}
      </Link>

      {/* Header */}
      <div className={styles.trackHeader}>
        <div>
          <h1 className={styles.trackTitle}>{order.orderNumber}</h1>
          <p className={styles.trackDate}>{t.trackOrderDate}: {new Date(order.createdAt).toLocaleDateString(params.locale, { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <span className={`${styles.statusBadge} ${styles[`status_${order.status}`] ?? ""}`}>
          {statusLabel[order.status] ?? order.status}
        </span>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {STATUS_ORDER.map((step, i) => {
          const done = currentIdx >= i;
          const active = currentIdx === i;
          return (
            <div key={step} className={`${styles.timelineStep} ${done ? styles.timelineStepDone : ""} ${active ? styles.timelineStepActive : ""}`}>
              <div className={styles.timelineDot}>
                <StatusIcon status={step} />
              </div>
              <span className={styles.timelineLabel}>{timelineLabels[step]}</span>
              {stepDateMap.has(step) && (
                <span className={styles.timelineDate}>
                  {new Date(stepDateMap.get(step)!).toLocaleDateString(params.locale, { day: "numeric", month: "short" })}
                  {" · "}
                  {new Date(stepDateMap.get(step)!).toLocaleTimeString(params.locale, { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {i < STATUS_ORDER.length - 1 && <div className={`${styles.timelineLine} ${currentIdx > i ? styles.timelineLineDone : ""}`} />}
            </div>
          );
        })}
      </div>

      {/* Shipping info */}
      {order.shipping && (
        <div className={styles.infoCard}>
          <h3 className={styles.infoCardTitle}><Truck size={16} /> {t.trackShippingInfo}</h3>
          <div className={styles.infoGrid}>
            {order.shipping.carrier && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t.trackCarrier}</span>
                <span className={styles.infoValue}>{order.shipping.carrier}</span>
              </div>
            )}
            {order.shipping.trackingNumber && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t.trackTrackingNumber}</span>
                <span className={styles.infoValue}>
                  {order.shipping.trackingUrl ? (
                    <a href={order.shipping.trackingUrl} target="_blank" rel="noopener noreferrer" className={styles.trackingLink}>
                      {order.shipping.trackingNumber}
                    </a>
                  ) : order.shipping.trackingNumber}
                </span>
              </div>
            )}
            {order.shipping.estimatedDeliveryAt && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t.trackEstimatedDelivery}</span>
                <span className={styles.infoValue}>{new Date(order.shipping.estimatedDeliveryAt).toLocaleDateString(params.locale, { month: "long", day: "numeric" })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div className={styles.infoCard}>
        <h3 className={styles.infoCardTitle}><Package size={16} /> {t.trackOrderSummary}</h3>
        <div className={styles.itemsList}>
          {order.items.map((item, i) => (
            <div key={i} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{item.title}</span>
                {item.options && item.options.length > 0 && (
                  <span className={styles.itemOptions}>
                    {item.options.map(o => `${o.attributeName}: ${o.value}`).join(" · ")}
                  </span>
                )}
              </div>
              <span className={styles.itemQty}>×{item.quantity}</span>
              <span className={styles.itemPrice}>{centsToEuros(item.totalCents)} €</span>
            </div>
          ))}
        </div>
        <div className={styles.totalSection}>
          {order.discountCents > 0 && (
            <div className={styles.totalRow}>
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{centsToEuros(order.discountCents)} €</span>
            </div>
          )}
          {order.shippingCents > 0 && (
            <div className={styles.totalRow}>
              <span>Shipping</span>
              <span>{centsToEuros(order.shippingCents)} €</span>
            </div>
          )}
          <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
            <span>Total</span>
            <span>{centsToEuros(order.totalCents)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}

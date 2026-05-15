"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./AdminVehicleFaqs.module.css";
import VehicleFaqFormModal, { type VehicleFaq } from "./VehicleFaqFormModal";

interface Props {
  carId: string;
}

export default function AdminVehicleFaqs({ carId }: Props) {
  const [faqs,    setFaqs]    = useState<VehicleFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ open: boolean; faq?: VehicleFaq }>({ open: false });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/next-api/vehicle-faqs?entityType=car&entityId=${carId}`);
      if (res.ok) setFaqs(await res.json());
    } finally { setLoading(false); }
  }, [carId]);

  useEffect(() => { load(); }, [load]);

  const toggleVisibility = async (faq: VehicleFaq) => {
    await fetch(`/next-api/vehicle-faqs/${faq.id}/visibility`, { method: "PATCH" });
    setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, isVisible: !f.isVisible } : f));
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/next-api/vehicle-faqs/${id}`, { method: "DELETE" });
    setFaqs(prev => prev.filter(f => f.id !== id));
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...faqs];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFaqs(next);
    await fetch("/next-api/vehicle-faqs/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map(f => f.id) }),
    });
  };

  const openAdd  = () => setModal({ open: true });
  const openEdit = (faq: VehicleFaq) => setModal({ open: true, faq });
  const closeModal = () => setModal({ open: false });
  const handleSaved = () => { closeModal(); load(); };

  if (loading) return <div style={{ padding: 32, color: "#94a3b8" }}>Loading…</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>FAQ</h2>
        <button className={styles.addBtn} onClick={openAdd}>+ Add FAQ</button>
      </div>

      {faqs.length === 0 ? (
        <p className={styles.empty}>No FAQs yet. Add one to help renters.</p>
      ) : (
        <ul className={styles.list} role="list">
          {faqs.map((faq, i) => (
            <li key={faq.id} className={`${styles.card} ${!faq.isVisible ? styles.hidden : ""}`}>
              <span className={styles.cardDrag} title="Reorder">⠿</span>

              <div className={styles.orderBtns}>
                <button className={styles.orderBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
                <button className={styles.orderBtn} onClick={() => move(i, 1)} disabled={i === faqs.length - 1} aria-label="Move down">▼</button>
              </div>

              <div className={styles.cardBody}>
                <p className={styles.cardQuestion}>{faq.question}</p>
                <p className={styles.cardAnswer}>{faq.answer}</p>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.visBtn}
                  onClick={() => toggleVisibility(faq)}
                  title={faq.isVisible ? "Hide" : "Show"}
                >
                  {faq.isVisible ? "Visible" : "Hidden"}
                </button>
                <button className={styles.editBtn} onClick={() => openEdit(faq)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => deleteFaq(faq.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal.open && (
        <VehicleFaqFormModal
          carId={carId}
          faq={modal.faq}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

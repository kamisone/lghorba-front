"use client";

import { useState, useEffect } from "react";
import styles from "./contacts.module.css";

interface Contact {
  id: string;
  name: string;
  contact: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/next-api/contacts?limit=100", { cache: "no-store" });
      if (res.ok) setContacts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const markRead = async (id: string) => {
    const res = await fetch(`/next-api/contacts/${id}/read`, { method: "PATCH" });
    if (res.ok) setContacts(prev => prev.map(c => c.id === id ? { ...c, read: true } : c));
  };

  const toggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    const c = contacts.find(c => c.id === id);
    if (c && !c.read) markRead(id);
  };

  const unreadCount = contacts.filter(c => !c.read).length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Contacts</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} unread</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingRow}><span className={styles.spinner} /></div>
      ) : contacts.length === 0 ? (
        <p className={styles.empty}>No contact messages yet.</p>
      ) : (
        <div className={styles.list}>
          {contacts.map(c => (
            <div
              key={c.id}
              className={`${styles.item} ${!c.read ? styles.itemUnread : ""} ${expandedId === c.id ? styles.itemOpen : ""}`}
            >
              <button className={styles.itemHeader} onClick={() => toggle(c.id)}>
                <div className={styles.itemMeta}>
                  {!c.read && <span className={styles.dot} aria-label="unread" />}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{c.name}</span>
                    <span className={styles.itemContact}>{c.contact}</span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.itemSubject}>{c.subject}</span>
                  <span className={styles.itemDate}>
                    {new Date(c.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className={styles.chevron}>{expandedId === c.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {expandedId === c.id && (
                <div className={styles.itemBody}>
                  <p className={styles.messageText}>{c.message}</p>
                  <div className={styles.itemFooter}>
                    <span className={styles.itemDateFull}>
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                    {!c.read && (
                      <button className={styles.readBtn} onClick={() => markRead(c.id)}>
                        Mark as read
                      </button>
                    )}
                    {c.read && <span className={styles.readLabel}>Read</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

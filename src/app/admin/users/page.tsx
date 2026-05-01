"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./users.module.css";
import CreateUserModal from "@/components/admin/CreateUserModal";
import { useModalUrl } from "@/hooks/useModalUrl";

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rentCount?: number;
  hasActiveSession?: boolean;
  score?: number;
  createdAt: string;
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 8 ? styles.scoreHigh : score >= 5 ? styles.scoreMid : styles.scoreLow;
  return <span className={`${styles.scoreBadge} ${cls}`}>{score}/10</span>;
}

export default function UsersPage() {
  const { openModal, closeModal } = useModalUrl();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("modal") === "user-create") setShowCreate(true);
  }, []);

  const fetchUsers = (q: string) => {
    setLoading(true);
    const url = q.trim()
      ? `/next-api/users?search=${encodeURIComponent(q.trim())}&limit=50`
      : "/next-api/users?limit=50";
    fetch(url, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(""); }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(val), 300);
  };

  const handleCreated = () => {
    setShowCreate(false);
    closeModal();
    fetchUsers(search);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Users</h1>
        <div className={styles.headerRight}>
          <div className={styles.searchWrap}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name or phone…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <button className={styles.addBtn} onClick={() => { setShowCreate(true); openModal("user-create"); }}>+ Add User</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingRow}><span className={styles.spinner} /></div>
      ) : users.length === 0 ? (
        <p className={styles.empty}>{search ? "No users match your search." : "No users yet. They are created automatically when a rent schedule is saved."}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Rents</th>
                <th>Score</th>
                <th>Joined</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className={styles.nameCell}>{u.name}</td>
                  <td>{u.phone || <span className={styles.na}>—</span>}</td>
                  <td>
                    <div className={styles.rentCell}>
                      {u.rentCount != null && u.rentCount > 0
                        ? <span className={styles.rentBadge}>{u.rentCount}</span>
                        : <span className={styles.na}>0</span>
                      }
                      {u.hasActiveSession && (
                        <span className={styles.activeDot} title="Ongoing session" />
                      )}
                    </div>
                  </td>
                  <td>
                    {u.score != null
                      ? <ScoreBadge score={u.score} />
                      : <span className={styles.na}>—</span>
                    }
                  </td>
                  <td className={styles.dateCell}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><Link href={`/admin/users/${u.id}`} className={styles.viewBtn}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => { setShowCreate(false); closeModal(); }}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { FileText, GripVertical, Plus, Trash2, Upload } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import styles from "./ProductFaqsManager.module.css";

export interface ProductDocument {
  id: string;
  title: string;
  storageKey: string;
  originalFilename: string;
  sizeBytes: number;
  sortOrder: number;
  url?: string;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  productId: string;
  documents: ProductDocument[];
  onChange: (documents: ProductDocument[]) => void;
  enValues: Record<string, string>;
  setEn: (field: string, value: string) => void;
}

export default function ProductDocumentsManager({ productId, documents, onChange, enValues, setEn }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function notify(next: ProductDocument[]) {
    onChange(next.map((d, i) => ({ ...d, sortOrder: i })));
  }

  function update(index: number, patch: Partial<ProductDocument>) {
    notify(documents.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function remove(index: number) {
    notify(documents.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...documents];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    notify(next);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/next-api/shop/products/${productId}/documents`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const doc: ProductDocument = {
        id: genId(),
        title: file.name.replace(/\.pdf$/i, ""),
        storageKey: data.storageKey,
        originalFilename: data.originalFilename,
        sizeBytes: data.sizeBytes,
        sortOrder: documents.length,
        url: data.url,
      };
      notify([...documents, doc]);
    } catch {
      // handled by caller
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} hidden />

      {documents.length === 0 && (
        <p className={styles.empty}>No documents yet. Upload PDF files (notice, fiche technique, etc.).</p>
      )}

      <div className={styles.list}>
        {documents.map((doc, i) => (
          <div
            key={doc.id}
            className={`${styles.card} ${dragIndex === i ? styles.cardDragging : ""}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className={styles.cardHead}>
              <span className={styles.dragHandle}><GripVertical size={16} /></span>
              <FileText size={16} style={{ color: "#dc2626", flexShrink: 0 }} />
              <span className={styles.cardTitle} style={{ fontSize: 12, color: "#64748b" }}>
                {doc.originalFilename} · {fmtSize(doc.sizeBytes)}
              </span>
              <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>
            <div className={styles.cardBody}>
              <BilingualField
                label="Section title"
                frValue={doc.title}
                frOnChange={val => update(i, { title: val })}
                frPlaceholder="e.g. Notice d'utilisation, Fiche technique"
                frRequired
                enValue={enValues[`document:${doc.id}:title`] ?? ""}
                enOnChange={val => setEn(`document:${doc.id}:title`, val)}
                enPlaceholder="e.g. User manual, Technical sheet"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.addBtn}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <><Upload size={16} /> Uploading...</>
        ) : (
          <><Plus size={16} /> <span>Upload PDF</span></>
        )}
      </button>

      <p className={styles.hint}>Upload PDF documents that customers can download from the product page. Drag to reorder.</p>
    </div>
  );
}

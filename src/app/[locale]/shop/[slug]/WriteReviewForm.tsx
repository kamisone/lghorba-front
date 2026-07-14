"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Star, X, Check } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import styles from "./ReviewsSection.module.css";

const Turnstile = dynamic(() => import("@/components/Turnstile"), { ssr: false });
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

interface ExistingReview {
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  media: Array<{ key: string; type: "image" | "video"; url: string }>;
  status: string;
}

interface MediaDraft {
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

interface Props {
  productId: string;
  locale: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function WriteReviewForm({ productId, locale, onClose, onSubmitted }: Props) {
  const t = getTranslations(locale).shop;
  const dialogRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<"verify" | "write" | "success">("verify");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [keepMediaKeys, setKeepMediaKeys] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<ExistingReview["media"]>([]);

  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newMedia, setNewMedia] = useState<MediaDraft[]>([]);

  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const renderedAt = useRef(0);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => { renderedAt.current = Date.now(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, [step]);

  useEffect(() => () => { newMedia.forEach(m => URL.revokeObjectURL(m.previewUrl)); }, [newMedia]);

  const needsTurnstile = !!TURNSTILE_SITE_KEY;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/next-api/public/shop/reviews/verify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim(), productId }),
      });
      const data = res.ok ? await res.json() : { verified: false };
      if (!data.verified) {
        setVerifyError(t.reviewVerifyError);
        return;
      }
      if (data.alreadyReviewed && data.existing) {
        const existing: ExistingReview = data.existing;
        setAlreadyReviewed(true);
        setAuthorName(existing.authorName);
        setRating(existing.rating);
        setTitle(existing.title ?? "");
        setBody(existing.body ?? "");
        setExistingMedia(existing.media ?? []);
        setKeepMediaKeys((existing.media ?? []).map(m => m.key));
      }
      setStep("write");
    } catch {
      setVerifyError(t.reviewVerifyError);
    } finally {
      setVerifying(false);
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const drafts: MediaDraft[] = Array.from(files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setNewMedia(prev => [...prev, ...drafts].slice(0, 5));
  }

  function removeExistingMedia(key: string) {
    setKeepMediaKeys(prev => prev.filter(k => k !== key));
    setExistingMedia(prev => prev.filter(m => m.key !== key));
  }

  function removeNewMedia(index: number) {
    setNewMedia(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.set("orderNumber", orderNumber.trim());
      fd.set("email", email.trim());
      fd.set("productId", productId);
      fd.set("authorName", authorName.trim());
      fd.set("rating", String(rating));
      if (title.trim()) fd.set("title", title.trim());
      if (body.trim())  fd.set("body", body.trim());
      if (alreadyReviewed) fd.set("keepMediaKeys", JSON.stringify(keepMediaKeys));
      fd.set("_hp", honeypot);
      fd.set("_t", String(renderedAt.current));
      if (turnstileToken) fd.set("_token", turnstileToken);
      newMedia.forEach(m => fd.append("media", m.file));

      const res = await fetch("/next-api/public/shop/reviews", { method: "POST", body: fd });
      if (!res.ok) { setSubmitError(t.reviewSubmitError); return; }
      setStep("success");
      onSubmitted();
    } catch {
      setSubmitError(t.reviewSubmitError);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = rating >= 1 && authorName.trim().length > 0 && (!needsTurnstile || !!turnstileToken);

  return createPortal(
    <div className={styles.overlay} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        <div className={styles.modalHead}>
          <h2 id="review-modal-title" className={styles.modalTitle}>
            {step === "verify" ? t.reviewModalTitleVerify : step === "write" ? t.reviewModalTitleWrite : t.reviewSuccessTitle}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.reviewClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {step === "verify" && (
          <form className={styles.form} onSubmit={handleVerify}>
            <p className={styles.hint}>{t.reviewVerifyHint}</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rv-order">{t.reviewOrderNumber} <span className={styles.req}>*</span></label>
              <input
                id="rv-order" className={styles.input} type="text" required
                placeholder={t.reviewOrderNumberPlaceholder}
                value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rv-email">{t.reviewEmail} <span className={styles.req}>*</span></label>
              <input
                id="rv-email" className={styles.input} type="email" required
                placeholder={t.reviewEmailPlaceholder}
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            {verifyError && <p className={styles.errorMsg} role="alert">{verifyError}</p>}
            <button type="submit" className={styles.submitBtn} disabled={verifying}>
              {verifying ? t.reviewVerifying : t.reviewVerifyBtn}
            </button>
          </form>
        )}

        {step === "write" && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="rv-hp">Leave this field blank</label>
              <input id="rv-hp" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
            </div>

            {alreadyReviewed && <p className={styles.editNotice}>{t.reviewEditNotice}</p>}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="rv-name">{t.reviewYourName} <span className={styles.req}>*</span></label>
              <input
                id="rv-name" className={styles.input} type="text" required maxLength={300}
                placeholder={t.reviewYourNamePlaceholder}
                value={authorName} onChange={e => setAuthorName(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t.reviewRating} <span className={styles.req}>*</span></span>
              <div className={styles.starInput} role="radiogroup" aria-label={t.reviewRating}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n}/5`}
                    className={`${styles.starBtn} ${n <= (hoverRating || rating) ? styles.starOn : ""}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star size={26} strokeWidth={1.75} fill={n <= (hoverRating || rating) ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="rv-title">{t.reviewTitleField}</label>
              <input
                id="rv-title" className={styles.input} type="text" maxLength={500}
                placeholder={t.reviewTitlePlaceholder}
                value={title} onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="rv-body">{t.reviewBodyField}</label>
              <textarea
                id="rv-body" className={styles.textarea} maxLength={5000} rows={4}
                placeholder={t.reviewBodyPlaceholder}
                value={body} onChange={e => setBody(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t.reviewMedia}</span>
              <label className={styles.mediaPicker}>
                {t.reviewAddMedia}
                <input
                  type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  style={{ display: "none" }}
                  onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </label>
              <p className={styles.hint}>{t.reviewMediaHint}</p>

              {(existingMedia.length > 0 || newMedia.length > 0) && (
                <div className={styles.mediaPreviewRow}>
                  {existingMedia.map(m => (
                    <div key={m.key} className={styles.mediaPreview}>
                      {m.type === "video" ? <video src={m.url} muted /> : <img src={m.url} alt="" />}
                      <button type="button" className={styles.mediaRemove} onClick={() => removeExistingMedia(m.key)} aria-label="Remove">×</button>
                    </div>
                  ))}
                  {newMedia.map((m, i) => (
                    <div key={m.previewUrl} className={styles.mediaPreview}>
                      {m.isVideo ? <video src={m.previewUrl} muted /> : <img src={m.previewUrl} alt="" />}
                      <button type="button" className={styles.mediaRemove} onClick={() => removeNewMedia(i)} aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {needsTurnstile && (
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                locale={locale}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            )}

            {submitError && <p className={styles.errorMsg} role="alert">{submitError}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setStep("verify")}>{t.reviewBack}</button>
              <button type="submit" className={styles.submitBtn} disabled={!canSubmit || submitting} style={{ flex: 1 }}>
                {submitting ? t.reviewSubmitting : t.reviewSubmit}
              </button>
            </div>
          </form>
        )}

        {step === "success" && (
          <div className={styles.successState}>
            <div className={styles.successIcon}><Check size={20} strokeWidth={2.25} /></div>
            <p className={styles.successSub}>{t.reviewSuccessSub}</p>
            <button type="button" className={styles.submitBtn} style={{ marginTop: 18 }} onClick={onClose}>{t.reviewDone}</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

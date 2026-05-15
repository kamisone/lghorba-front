"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast/ToastContext";
import styles from "./ShareVehicle.module.css";

export interface ShareLabels {
  share: string;
  shareVia: string;
  copyLink: string;
  copied: string;
  email: string;
}

interface ShareVehicleProps {
  title: string;
  labels: ShareLabels;
}

function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function NativeShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export default function ShareVehicle({ title, labels }: ShareVehicleProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setHasNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const getUrl = () => window.location.href;

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, url: getUrl() });
    } catch {
      // user cancelled — silent
    }
  }, [title]);

  const handleCopy = useCallback(async () => {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API unavailable — execCommand fallback
      const el = document.createElement("input");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    toast.success(labels.copied);
    setTimeout(() => setCopied(false), 2500);
  }, [labels.copied, toast]);

  const openPopup = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "width=620,height=460,noopener,noreferrer");
  };

  const handleFacebook = () => {
    openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`);
  };

  const handleX = () => {
    const u = encodeURIComponent(getUrl());
    const t = encodeURIComponent(title);
    openPopup(`https://twitter.com/intent/tweet?url=${u}&text=${t}`);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${title} — ${getUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleLinkedIn = () => {
    openPopup(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getUrl())}`);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${title}\n\n${getUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className={styles.shareBar} role="group" aria-label={labels.shareVia}>
      {hasNativeShare && (
        <button
          className={styles.nativeShareBtn}
          onClick={handleNativeShare}
          aria-label={labels.share}
        >
          <NativeShareIcon />
          <span>{labels.share}</span>
        </button>
      )}
      <div className={styles.iconRow}>
        <button
          className={`${styles.iconBtn} ${styles.whatsapp}`}
          onClick={handleWhatsApp}
          aria-label="WhatsApp"
          title="WhatsApp"
        >
          <WhatsAppIcon />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.facebook}`}
          onClick={handleFacebook}
          aria-label="Facebook"
          title="Facebook"
        >
          <FacebookIcon />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.twitter}`}
          onClick={handleX}
          aria-label="X (Twitter)"
          title="X (Twitter)"
        >
          <XIcon />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.linkedin}`}
          onClick={handleLinkedIn}
          aria-label="LinkedIn"
          title="LinkedIn"
        >
          <LinkedInIcon />
        </button>
        <button
          className={styles.iconBtn}
          onClick={handleEmail}
          aria-label={labels.email}
          title={labels.email}
        >
          <EmailIcon />
        </button>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copiedBtn : ""}`}
          onClick={handleCopy}
          aria-label={labels.copyLink}
          title={labels.copyLink}
          aria-pressed={copied}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? labels.copied : labels.copyLink}</span>
        </button>
      </div>
    </div>
  );
}

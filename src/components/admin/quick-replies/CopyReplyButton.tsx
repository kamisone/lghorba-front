"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import { applyPlaceholders, type PlaceholderVars, type QuickReply } from "./types";
import styles from "./CopyReplyButton.module.css";

interface Props {
  reply: QuickReply;
  /** Vehicle context values substituted into {{car_name}} / {{plate}} / {{phone}}. */
  vars?: PlaceholderVars;
  /** "solid" for the primary card action, "ghost" for table rows. */
  variant?: "solid" | "ghost";
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-secure contexts (e.g. LAN testing over http).
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  try {
    if (!document.execCommand("copy")) throw new Error("execCommand failed");
  } finally {
    document.body.removeChild(el);
  }
}

export default function CopyReplyButton({ reply, vars, variant = "solid" }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    try {
      await writeClipboard(applyPlaceholders(reply.body, vars));
      setCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
      toast.success("Reply copied to clipboard");
      // Fire-and-forget usage telemetry — a failure must never block the copy UX.
      fetch(`/next-api/quick-replies/${reply.id}/track-usage`, { method: "POST" }).catch(() => {});
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <button
      type="button"
      className={`${styles.btn} ${variant === "ghost" ? styles.ghost : styles.solid} ${copied ? styles.copied : ""}`}
      onClick={handleCopy}
      title="Copy message to clipboard"
    >
      {copied
        ? <><Check size={14} strokeWidth={2.25} /> Copied</>
        : <><Copy size={14} strokeWidth={1.75} /> Copy</>
      }
    </button>
  );
}

"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent, ClipboardEvent } from "react";
import styles from "@/app/login/login.module.css";
import mfaStyles from "./MfaForm.module.css";

interface Props {
  challengeToken: string;
  availableMethods: ("email" | "sms")[];
  preferredMethod: "email" | "sms";
  maskedDestination: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function MfaForm({
  challengeToken,
  availableMethods,
  preferredMethod,
  maskedDestination: initialMasked,
  onSuccess,
  onBack,
}: Props) {
  const [digits,    setDigits]    = useState(["", "", "", "", "", ""]);
  const [method,    setMethod]    = useState<"email" | "sms">(preferredMethod);
  const [masked,    setMasked]    = useState(initialMasked);
  const [error,     setError]     = useState("");
  const [inputError, setInputError] = useState(false);   // highlight digit boxes
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown,  setCooldown]  = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [cooldown]);

  const otp = digits.join("");

  const clearError = () => { setError(""); setInputError(false); };

  const handleDigit = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (inputError && char) setInputError(false);
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    clearError();
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const showError = (msg: string, markInputs = false) => {
    setError(msg);
    setInputError(markInputs);
    if (markInputs) {
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    clearError();
    try {
      const res = await fetch("/next-api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, otp }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        // Mark inputs as invalid for wrong/expired code; not for challenge errors
        const markInputs = res.status !== 401;
        showError(data.error ?? "Authentication failed. Please try again.", markInputs);
      }
    } catch {
      showError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (newMethod?: "email" | "sms") => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    clearError();
    try {
      const res = await fetch("/next-api/auth/mfa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, method: newMethod ?? method }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (newMethod) setMethod(newMethod);
        setMasked(data.maskedDestination ?? masked);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setCooldown(60);
      } else {
        showError(data.error ?? "Failed to send code. Please try again.");
        if (res.status === 429) setCooldown(60);
      }
    } catch {
      showError("A network error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const otherMethod = availableMethods.find(m => m !== method);

  return (
    <div className={styles.card}>
      <div className={styles.brand}>
        <div className={mfaStyles.mfaIcon}>🔐</div>
        <h1 className={styles.title}>Verification</h1>
        <p className={styles.subtitle}>
          Code sent to <strong>{masked}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={mfaStyles.digitRow} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              className={[mfaStyles.digitInput, inputError ? mfaStyles.digitInputError : ""].filter(Boolean).join(" ")}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              autoComplete="one-time-code"
              aria-invalid={inputError}
            />
          ))}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button
          className={styles.btn}
          type="submit"
          disabled={loading || otp.length < 6}
          style={{ marginBottom: "0.75rem" }}
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      <div className={mfaStyles.actions}>
        <button
          className={mfaStyles.linkBtn}
          type="button"
          onClick={() => handleResend()}
          disabled={resending || cooldown > 0}
        >
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>

        {otherMethod && (
          <button
            className={mfaStyles.linkBtn}
            type="button"
            onClick={() => handleResend(otherMethod)}
            disabled={resending || cooldown > 0}
          >
            Send via {otherMethod === "sms" ? "SMS" : "email"} instead
          </button>
        )}

        <button className={mfaStyles.linkBtn} type="button" onClick={onBack}>
          ← Back to login
        </button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/toast/ToastContext";

interface MutateOptions {
  successMsg: string;
  onSuccess?: () => void;
}

export function useAdminMutation() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const mutate = useCallback(
    async (url: string, method: string, body: unknown, opts: MutateOptions) => {
      setSaving(true);
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success(opts.successMsg);
          opts.onSuccess?.();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error((err as any).message ?? "Operation failed");
        }
        return res.ok;
      } finally {
        setSaving(false);
      }
    },
    [toast],
  );

  return { saving, mutate };
}

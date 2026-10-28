"use client";

import React from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";

export interface DelightToastMessage {
  id: number;
  title: string;
  detail?: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface DelightToastProps {
  toast: DelightToastMessage | null;
  onDismiss: () => void;
}

export function DelightToast({ toast, onDismiss }: DelightToastProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-20 z-40 max-w-sm sm:right-6"
    >
      <div className="delight-toast-animate pointer-events-auto flex items-start gap-3 rounded-subtle border border-sage-muted bg-surface px-4 py-3 shadow-[0_12px_32px_-12px_rgba(26,38,31,0.22)]">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-editorial bg-sage-soft text-forest">
          {toast.actionHref ? (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1 text-xs">
          <p className="font-medium text-ink">{toast.title}</p>
          {toast.detail && (
            <p className="mt-0.5 leading-relaxed text-ink-secondary">{toast.detail}</p>
          )}
          {toast.actionLabel && toast.actionHref && (
            <a
              href={toast.actionHref}
              onClick={onDismiss}
              className="mt-1.5 inline-block font-medium text-forest underline decoration-forest/40 underline-offset-4 hover:text-forest-hover"
            >
              {toast.actionLabel}
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-editorial text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

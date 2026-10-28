"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisMode } from "@/lib/youcam/types";

export interface AnalysisProgressProps {
  stage: "submitting" | "polling";
  mode: AnalysisMode;
  publicRef: string | null;
  pollCount: number;
  onCancel: () => void;
}

export function AnalysisProgress({
  stage,
  mode,
  publicRef,
  pollCount,
  onCancel,
}: AnalysisProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const steps = [
    {
      id: "validate",
      label: "Portrait specifications verified locally",
      state: "done" as const,
    },
    {
      id: "submit",
      label: "Validating binary image & registering YouCam v2.1 task via server proxy",
      state: stage === "submitting" ? ("active" as const) : ("done" as const),
    },
    {
      id: "poll",
      label:
        mode === "hd"
          ? "Awaiting YouCam v2.1 HD skin analysis completion"
          : "Awaiting YouCam v2.1 SD skin analysis completion",
      state: stage === "polling" ? ("active" as const) : ("pending" as const),
    },
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-editorial border border-stone-border bg-surface p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-border pb-4">
        <div>
          <p className="eyebrow-label text-sage-botanical">
            {stage === "submitting" ? "Submission in progress" : "Analysis processing"}
          </p>
          <h3 className="mt-1.5 font-serif text-2xl text-ink">
            {stage === "submitting"
              ? "Preparing your portrait for analysis"
              : "Evaluating optical skin characteristics"}
          </h3>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-ink-secondary">
          <span>Elapsed {elapsedSeconds}s</span>
          {stage === "polling" && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>Status check #{Math.max(1, pollCount)}</span>
            </>
          )}
        </div>
      </div>

      {/* Subtle indeterminate motion track — never a fake percentage */}
      <div
        className="mt-5 h-[2px] w-full overflow-hidden bg-sage-soft"
        aria-hidden="true"
      >
        <div className="h-full w-1/3 animate-pulse bg-forest" />
      </div>

      <ol className="mt-6 space-y-3.5">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                step.state === "done" && "border-forest bg-forest text-surface",
                step.state === "active" && "border-forest bg-sage-soft text-forest",
                step.state === "pending" && "border-stone-border bg-canvas text-ink-muted"
              )}
              aria-hidden="true"
            >
              {step.state === "done" ? (
                <Check className="h-3 w-3" />
              ) : step.state === "active" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-stone-strong" />
              )}
            </span>
            <span
              className={cn(
                step.state === "pending" ? "text-ink-muted" : "text-ink"
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-border pt-4 text-xs text-ink-secondary">
        <div className="space-y-0.5">
          <p>
            Processing time varies with server queue load; status is polled directly from YouCam
            v2.1 without estimated percentages.
          </p>
          {publicRef && (
            <p className="font-mono text-[11px] text-ink-muted">
              Reference: {publicRef}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-[40px] items-center rounded-editorial border border-stone-strong bg-canvas px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
        >
          Cancel wait
        </button>
      </div>
    </div>
  );
}

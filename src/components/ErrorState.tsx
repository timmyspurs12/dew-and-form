"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Clock,
  FlaskConical,
  KeyRound,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import type { StructuredAnalysisError } from "@/lib/youcam/types";

export interface ErrorStateProps {
  error: StructuredAnalysisError;
  onRetry?: () => void;
  retryLabel?: string;
  onReset: () => void;
  onLoadFixture?: () => void;
}

export function ErrorState({
  error,
  onRetry,
  retryLabel,
  onReset,
  onLoadFixture,
}: ErrorStateProps) {
  const [cooldown, setCooldown] = useState<number>(() =>
    error.category === "rate_limited" && error.retryAfterSeconds ? error.retryAfterSeconds : 0
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const Icon =
    error.category === "rate_limited" ||
    error.category === "expired" ||
    error.category === "timeout"
      ? Clock
      : error.category === "api_not_configured"
        ? KeyRound
        : error.category === "network"
          ? WifiOff
          : error.category === "unauthorized"
            ? ShieldAlert
            : AlertCircle;

  const badgeLabel: Record<StructuredAnalysisError["category"], string> = {
    validation: "Image Validation",
    api_not_configured: "Server Configuration",
    rate_limited: "Rate Limit (HTTP 429)",
    expired: "Expired Result",
    image_quality: "Portrait Framing & Lighting",
    network: "Network Connection",
    timeout: "Request Timeout",
    unauthorized: "Session Verification",
    api_failure: "Provider Notice",
  };

  const canShowRetry =
    Boolean(onRetry) &&
    error.category !== "expired" &&
    error.category !== "validation" &&
    error.category !== "unauthorized";

  return (
    <div
      role="alert"
      className="rounded-editorial border border-clay/60 bg-surface p-6 sm:p-8"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-editorial bg-clay-soft text-clay-deep">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-editorial bg-clay-soft px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-clay-deep">
              {badgeLabel[error.category]}
            </span>
            <span className="font-mono text-[11px] text-ink-muted">
              Code: {error.code}
            </span>
          </div>

          <h3 className="mt-2 font-serif text-xl text-ink sm:text-2xl">
            {error.title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            {error.message}
          </p>

          {error.guidance && error.guidance.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-l-2 border-stone-strong pl-4 text-xs leading-relaxed text-ink-secondary">
              {error.guidance.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {canShowRetry && (
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={onRetry}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover disabled:cursor-not-allowed disabled:opacity-55"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {cooldown > 0
                    ? `Retry available in ${cooldown}s`
                    : retryLabel || "Retry analysis"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-stone-strong bg-canvas px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {error.category === "expired" || error.category === "unauthorized"
                  ? "Start a fresh analysis"
                  : "Choose a different photo"}
              </span>
            </button>

            {onLoadFixture && error.category === "api_not_configured" && (
              <button
                type="button"
                onClick={onLoadFixture}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-sage-botanical/50 bg-sage-soft/70 px-4 py-2.5 text-xs font-medium text-forest transition-colors hover:bg-sage-soft"
              >
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Load documented YouCam fixture (Dev preview)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

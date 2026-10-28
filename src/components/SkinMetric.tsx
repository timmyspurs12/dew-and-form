"use client";

import React, { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONCERN_METADATA } from "@/lib/youcam/metadata";
import type { NormalizedSkinMetric } from "@/lib/youcam/types";
import { describeScoreCue, getDisplayScore, type ScoreDisplayBasis } from "./SkinInsightsOverview";

export interface SkinMetricProps {
  metric: NormalizedSkinMetric;
  scoreBasis: ScoreDisplayBasis;
  activeMaskUrl: string | null;
  onSelectMask: (maskUrl: string | null, label: string) => void;
}

export function SkinMetric({
  metric,
  scoreBasis,
  activeMaskUrl,
  onSelectMask,
}: SkinMetricProps) {
  const [open, setOpen] = useState(false);
  const meta = CONCERN_METADATA[metric.key];
  const score = getDisplayScore(metric, scoreBasis);
  const cue = describeScoreCue(score);
  const subRegions = metric.regions.filter((r) => r.region !== "whole");
  const isMaskSelected = Boolean(metric.maskUrl && activeMaskUrl === metric.maskUrl);

  const clampedWidth = score !== null ? Math.min(100, Math.max(2, score)) : 0;

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className="border-b border-stone-border last:border-b-0"
    >
      <div className="py-4 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Metric Title & Cue Descriptor (never communicates meaning via colour alone) */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-medium text-ink sm:text-base">{metric.label}</h4>
              <span className="font-mono text-[11px] text-ink-muted">({metric.apiType})</span>
              {subRegions.length > 0 && (
                <span className="rounded-editorial bg-sage-soft px-2 py-0.5 font-mono text-[10px] text-forest">
                  {subRegions.length} zones
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-ink-secondary">{cue.bandLabel}</p>
          </div>

          {/* Score Readout, Bar, and Detail Trigger */}
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="w-36 sm:w-44">
              {score !== null ? (
                <div>
                  <div className="flex items-baseline justify-between font-mono text-xs">
                    <span className="font-medium text-ink">{score}</span>
                    <span className="text-[10px] text-ink-muted">/ 100 index</span>
                  </div>
                  <div
                    className="relative mt-1.5 h-1.5 w-full bg-canvas-subtle"
                    role="meter"
                    aria-label={`${metric.label} score on 1 to 100 scale`}
                    aria-valuemin={1}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(score)}
                  >
                    <div
                      className={cn(
                        "h-full transition-all duration-300 ease-editorial",
                        cue.tone === "focus"
                          ? "bg-clay"
                          : cue.tone === "moderate"
                            ? "bg-sage-botanical"
                            : "bg-forest"
                      )}
                      style={{ width: `${clampedWidth}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="inline-block rounded-editorial border border-dashed border-stone-strong px-2 py-0.5 text-xs text-ink-secondary">
                  Whole score omitted
                </span>
              )}
            </div>

            <Collapsible.Trigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-editorial border border-stone-border bg-canvas px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
                aria-label={`${open ? "Hide" : "Show"} details for ${metric.label}`}
              >
                <span>Details</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200 ease-editorial",
                    open && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>
            </Collapsible.Trigger>
          </div>
        </div>

        <Collapsible.Content className="overflow-hidden">
          <div className="mt-4 space-y-4 rounded-editorial border border-stone-border bg-canvas p-4 text-xs leading-relaxed text-ink-secondary">
            {/* Dual Score Transparency */}
            <div className="flex flex-wrap items-center gap-6 border-b border-stone-border pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Consumer UI Score (ui_score)
                </span>
                <p className="mt-0.5 font-mono text-sm font-medium text-ink">
                  {metric.uiScore !== null ? `${metric.uiScore} / 100` : "Not returned"}
                </p>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Direct Model Score (raw_score)
                </span>
                <p className="mt-0.5 font-mono text-sm font-medium text-ink">
                  {metric.rawScore !== null ? `${metric.rawScore} / 100` : "Not returned"}
                </p>
              </div>
              {metric.maskUrl && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectMask(isMaskSelected ? null : metric.maskUrl, metric.label)
                  }
                  className={cn(
                    "ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-editorial border px-3 py-1.5 text-xs font-medium transition-colors",
                    isMaskSelected
                      ? "border-forest bg-forest text-surface"
                      : "border-stone-strong bg-surface text-ink hover:bg-sage-soft/60"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isMaskSelected ? "Hide detection overlay" : "Preview detection overlay"}</span>
                </button>
              )}
            </div>

            {/* Regional Sub-scores if returned */}
            {subRegions.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Measured Facial Sub-Regions
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {subRegions.map((reg) => {
                    const regVal =
                      scoreBasis === "raw"
                        ? (reg.rawScore ?? reg.uiScore)
                        : (reg.uiScore ?? reg.rawScore);
                    return (
                      <div
                        key={reg.region}
                        className="flex items-center justify-between rounded-editorial border border-stone-border bg-surface px-3 py-2"
                      >
                        <span className="text-ink">{reg.regionLabel}</span>
                        <span className="font-mono font-medium text-ink">
                          {regVal !== null ? `${regVal} / 100` : "Not returned"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What it represents + Optical limitation */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-ink">What this metric represents</p>
                <p className="mt-1">{meta.whatItRepresents}</p>
              </div>
              <div>
                <p className="font-medium text-ink">Optical &amp; lighting context</p>
                <p className="mt-1">{meta.opticalNote}</p>
              </div>
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

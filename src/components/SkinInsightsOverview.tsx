"use client";

import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONCERN_METADATA } from "@/lib/youcam/metadata";
import type { NormalizedSkinAnalysisResult, NormalizedSkinMetric } from "@/lib/youcam/types";

export type ScoreDisplayBasis = "ui" | "raw";

export interface SkinInsightsOverviewProps {
  result: NormalizedSkinAnalysisResult;
  scoreBasis: ScoreDisplayBasis;
  onScoreBasisChange: (basis: ScoreDisplayBasis) => void;
  onSelectMask?: (maskUrl: string | null, label: string) => void;
}

export function getDisplayScore(
  metric: NormalizedSkinMetric,
  basis: ScoreDisplayBasis
): number | null {
  if (basis === "raw") {
    return metric.rawScore ?? metric.uiScore;
  }
  return metric.uiScore ?? metric.rawScore;
}

export function describeScoreCue(score: number | null): {
  bandLabel: string;
  tone: "calm" | "moderate" | "focus" | "unavailable";
} {
  if (score === null) {
    return { bandLabel: "Score not returned", tone: "unavailable" };
  }
  // Per YouCam documentation: 1–100 scale where higher indicates fewer visible cues (~70 is population midpoint)
  if (score >= 76) {
    return { bandLabel: "Subtle optical cue", tone: "calm" };
  }
  if (score >= 62) {
    return { bandLabel: "Moderate optical cue", tone: "moderate" };
  }
  return { bandLabel: "More noticeable optical cue", tone: "focus" };
}

export function SkinInsightsOverview({
  result,
  scoreBasis,
  onScoreBasisChange,
  onSelectMask,
}: SkinInsightsOverviewProps) {
  const scoredMetrics = result.metrics
    .map((m) => ({
      metric: m,
      score: getDisplayScore(m, scoreBasis),
    }))
    .filter((entry): entry is { metric: NormalizedSkinMetric; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score);

  // Two lowest-scoring returned metrics represent the primary observed cues
  const priorityMetrics = scoredMetrics.slice(0, 2);

  const hasSkinType =
    Boolean(result.skinType.whole) || result.skinType.zones.length > 0;

  return (
    <div className="space-y-6">
      {/* Primary Editorial Insight Card */}
      <div className="rounded-editorial border border-stone-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-border pb-5">
          <div>
            <p className="eyebrow-label text-sage-botanical">Primary Skin Reading</p>
            <h3 className="mt-2 font-serif text-display-sm font-normal text-ink">
              {result.skinType.whole
                ? `Your analysis indicates a ${result.skinType.whole.toLowerCase()} complexion profile.`
                : "Your analysis returned optical condition metrics across measured zones."}
            </h3>
          </div>

          {/* Score Basis Transparency Switch (UI vs Raw Score) */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Score Calibration View
            </span>
            <div
              role="radiogroup"
              aria-label="YouCam score basis"
              className="mt-1 inline-grid grid-cols-2 rounded-editorial border border-stone-border bg-canvas p-0.5"
            >
              <button
                type="button"
                role="radio"
                aria-checked={scoreBasis === "ui"}
                onClick={() => onScoreBasisChange("ui")}
                className={cn(
                  "min-h-[34px] rounded-editorial px-3 py-1 text-xs font-medium transition-colors",
                  scoreBasis === "ui"
                    ? "bg-forest text-surface"
                    : "text-ink-secondary hover:text-ink"
                )}
              >
                UI Score (1–100)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={scoreBasis === "raw"}
                onClick={() => onScoreBasisChange("raw")}
                className={cn(
                  "min-h-[34px] rounded-editorial px-3 py-1 text-xs font-medium transition-colors",
                  scoreBasis === "raw"
                    ? "bg-forest text-surface"
                    : "text-ink-secondary hover:text-ink"
                )}
              >
                Raw Model (1–100)
              </button>
            </div>
          </div>
        </div>

        {/* Calibration Explanation Note */}
        <div className="mt-4 flex items-start gap-2.5 rounded-editorial bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-ink-secondary">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-botanical" aria-hidden="true" />
          <p>
            YouCam reports metrics on a <strong className="font-medium text-ink">1–100 condition index</strong>{" "}
            (not a percentage), where higher numbers indicate fewer detected optical cues.{" "}
            {scoreBasis === "ui"
              ? "Currently showing YouCam's consumer-calibrated ui_score."
              : "Currently showing YouCam's unadjusted floating-point raw_score."}
          </p>
        </div>

        {/* Summary Indices & Skin Type Zones */}
        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-stone-border pt-6 sm:grid-cols-3">
          {/* Skin Type Breakdown */}
          <div className="sm:border-r sm:border-stone-border sm:pr-5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Skin Type Classification
            </p>
            {hasSkinType ? (
              <div className="mt-2 space-y-1.5">
                <p className="font-serif text-2xl text-ink">
                  {result.skinType.whole ?? "Zone-specific"}
                </p>
                {result.skinType.zones.length > 0 && (
                  <dl className="space-y-1 pt-1 text-xs">
                    {result.skinType.zones
                      .filter((z) => z.zone !== "whole")
                      .map((zone) => (
                        <div key={zone.zone} className="flex items-center justify-between gap-2">
                          <dt className="text-ink-secondary">{zone.zoneLabel}:</dt>
                          <dd className="font-medium text-ink">{zone.classification}</dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <span className="inline-block rounded-editorial border border-dashed border-stone-strong bg-canvas px-2.5 py-1 text-xs text-ink-secondary">
                  Not returned in this task
                </span>
                <p className="mt-1.5 text-xs text-ink-secondary">
                  Skin type was not included in this API response.
                </p>
              </div>
            )}
          </div>

          {/* Composite Condition Score (`all.score`) */}
          <div className="sm:border-r sm:border-stone-border sm:pr-5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Composite Condition Index
            </p>
            {result.overallScore !== null ? (
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl text-ink">
                    {result.overallScore}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">/ 100 index</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                  YouCam <code className="font-mono text-[11px]">all.score</code> summary across
                  returned visual features.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <span className="inline-block rounded-editorial border border-dashed border-stone-strong bg-canvas px-2.5 py-1 text-xs text-ink-secondary">
                  Not returned in this task
                </span>
                <p className="mt-1.5 text-xs text-ink-secondary">
                  Composite summary score was omitted in this payload.
                </p>
              </div>
            )}
          </div>

          {/* Optical Skin Age Reference (`skin_age`) */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Optical Reference Age
            </p>
            {result.estimatedSkinAge !== null ? (
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl text-ink">
                    {result.estimatedSkinAge}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">yrs (est.)</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                  Statistical comparison to population photography—not biological skin age.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <span className="inline-block rounded-editorial border border-dashed border-stone-strong bg-canvas px-2.5 py-1 text-xs text-ink-secondary">
                  Not returned in this task
                </span>
                <p className="mt-1.5 text-xs text-ink-secondary">
                  <code className="font-mono text-[11px]">skin_age</code> was not returned in this task.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asymmetric Priority Observation Callouts (Distinct from regular metric ledger) */}
      {priorityMetrics.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {priorityMetrics.map(({ metric, score }, idx) => {
            const meta = CONCERN_METADATA[metric.key];
            const cue = describeScoreCue(score);
            const subRegions = metric.regions.filter((r) => r.region !== "whole");

            return (
              <article
                key={metric.key}
                className={cn(
                  "flex flex-col justify-between rounded-editorial border border-stone-border p-5 sm:p-6",
                  idx === 0
                    ? "bg-sage-soft/55 md:col-span-7"
                    : "bg-surface md:col-span-5"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-sage-botanical">
                      {idx === 0 ? "Primary Observed Cue" : "Secondary Observed Cue"}
                    </span>
                    <span className="rounded-editorial border border-stone-border bg-surface px-2 py-0.5 text-[11px] font-medium text-ink">
                      {cue.bandLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-4">
                    <h4 className="font-serif text-2xl text-ink">{metric.label}</h4>
                    <div className="text-right">
                      <span className="font-serif text-2xl text-ink">{score}</span>
                      <span className="ml-1 font-mono text-xs text-ink-muted">/ 100</span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-ink-secondary">
                    {meta.whatItRepresents}
                  </p>

                  {subRegions.length > 0 && (
                    <div className="mt-4 border-t border-stone-border/80 pt-3">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        Regional Breakdown
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {subRegions.map((reg) => {
                          const regVal =
                            scoreBasis === "raw"
                              ? (reg.rawScore ?? reg.uiScore)
                              : (reg.uiScore ?? reg.rawScore);
                          return (
                            <span
                              key={reg.region}
                              className="inline-flex items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-2.5 py-1 text-xs text-ink"
                            >
                              <span className="text-ink-secondary">{reg.regionLabel}:</span>
                              <strong className="font-mono font-medium">
                                {regVal !== null ? regVal : "—"}
                              </strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {metric.maskUrl && onSelectMask && (
                  <div className="mt-4 pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectMask(metric.maskUrl, metric.label)}
                      className="text-xs font-medium text-forest underline decoration-forest/40 underline-offset-4 transition-colors hover:text-forest-hover"
                    >
                      View {metric.label.toLowerCase()} zone overlay on portrait panel
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  EyeOff,
  FlaskConical,
  Layers,
  Moon,
  RotateCcw,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CARE_THEME_METADATA,
  CONCERN_GROUP_LABELS,
  composeRoutineBlueprint,
  type CareFocusTheme,
} from "@/lib/youcam/metadata";
import type { FormulationCategory } from "@/lib/ingredients/types";
import type { ConcernGroup, NormalizedSkinAnalysisResult } from "@/lib/youcam/types";
import { SkinInsightsOverview, type ScoreDisplayBasis } from "./SkinInsightsOverview";
import { SkinMetric } from "./SkinMetric";

export interface SkinResultsPanelProps {
  result: NormalizedSkinAnalysisResult;
  /** Original uploaded image URL ONLY when result came from a live YouCam analysis */
  analysedPortraitUrl: string | null;
  hasUnanalysedLocalPreview: boolean;
  selectedThemes: CareFocusTheme[];
  onToggleTheme: (theme: CareFocusTheme) => void;
  onSelectRoutineCategory?: (category: FormulationCategory | "All") => void;
  onStartOver: () => void;
}

const ORDERED_GROUPS: ConcernGroup[] = [
  "hydration_balance",
  "surface_texture",
  "tone_clarity",
  "lines_contour",
];

export function SkinResultsPanel({
  result,
  analysedPortraitUrl,
  hasUnanalysedLocalPreview,
  selectedThemes,
  onToggleTheme,
  onSelectRoutineCategory,
  onStartOver,
}: SkinResultsPanelProps) {
  const [scoreBasis, setScoreBasis] = useState<ScoreDisplayBasis>("ui");
  const [activeMask, setActiveMask] = useState<{ url: string; label: string } | null>(null);
  const [maskOpacity, setMaskOpacity] = useState<number>(75);
  const [maskLoadFailed, setMaskLoadFailed] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNowTimestamp(Date.now()), 0);
    const interval = window.setInterval(() => setNowTimestamp(Date.now()), 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  const isFixture = result.dataSource === "development-fixture";

  const masksExpired = useMemo(() => {
    if (!result.masksExpireAt || nowTimestamp === null) return false;
    return new Date(result.masksExpireAt).getTime() <= nowTimestamp;
  }, [result.masksExpireAt, nowTimestamp]);

  const availableMasks = useMemo(() => {
    const items: Array<{ label: string; url: string }> = [];
    for (const z of result.skinType.zones) {
      if (z.maskUrl) {
        items.push({ label: `Skin Type · ${z.zoneLabel}`, url: z.maskUrl });
      }
    }
    for (const m of result.metrics) {
      if (m.maskUrl) {
        items.push({ label: m.label, url: m.maskUrl });
      }
    }
    return items;
  }, [result]);

  const routineBlueprint = useMemo(
    () => (selectedThemes.length > 0 ? composeRoutineBlueprint(selectedThemes) : null),
    [selectedThemes]
  );

  const handleJumpToStepCategory = (cat: FormulationCategory) => {
    onSelectRoutineCategory?.(cat);
    document.getElementById("discovery")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectMask = (url: string | null, label: string) => {
    setMaskLoadFailed(false);
    if (!url) {
      setActiveMask(null);
    } else {
      setActiveMask({ url, label });
    }
  };

  return (
    <div className="space-y-12">
      {/* Data Source Provenance Banner */}
      {isFixture ? (
        <div
          role="region"
          aria-label="Development fixture provenance notice"
          className="rounded-editorial border border-clay/65 bg-clay-soft/65 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <FlaskConical
                className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep"
                aria-hidden="true"
              />
              <div className="text-xs leading-relaxed text-clay-deep">
                <p className="font-semibold uppercase tracking-wider">
                  {result.fixtureLabel ?? "Development Fixture · Sample YouCam Schema"}
                </p>
                <p className="mt-1">
                  These scores render a documented Perfect Corp YouCam API sample payload so you can
                  inspect the insights, regional sub-scores, missing-data handling, and formulation
                  discovery flow.{" "}
                  <strong>They are not a live AI scan of your face.</strong>
                  {hasUnanalysedLocalPreview &&
                    " Your selected browser preview remains unanalysed unless submitted with a live server YOUCAM_API_KEY."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-editorial border border-clay/50 bg-surface px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear fixture</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-editorial border border-sage-muted bg-sage-soft/55 px-5 py-3.5 text-xs text-ink">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-forest">
              <span className="h-2 w-2 rounded-full bg-forest" aria-hidden="true" />
              Live YouCam AI Skin Analysis ({result.mode.toUpperCase()})
            </span>
            <span className="font-mono text-[11px] text-ink-secondary">
              Task {result.taskId.slice(0, 16)}&hellip;
            </span>
          </div>
          <button
            type="button"
            onClick={onStartOver}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-surface px-3 py-1 text-xs font-medium text-ink hover:bg-canvas"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>Start new analysis</span>
          </button>
        </div>
      )}

      {/* Upper Editorial Insights Grid: Visual Reference (5 cols) + Primary Insights (7 cols) */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Sticky Column: Source Image / Zone Map & Detection Overlays */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:col-span-5">
          <div className="rounded-editorial border border-stone-border bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="eyebrow-label text-sage-botanical">
                {isFixture ? "Diagrammatic Zone Map" : "Analysed Portrait & Masks"}
              </p>
              <span className="font-mono text-[11px] text-ink-muted">
                {activeMask ? activeMask.label : "Base view"}
              </span>
            </div>

            <div className="relative aspect-[5/6] w-full overflow-hidden rounded-editorial border border-stone-border bg-canvas-subtle">
              {!isFixture && (analysedPortraitUrl || result.resizedImageUrl) ? (
                /* Live Analysed User Portrait */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={analysedPortraitUrl ?? result.resizedImageUrl ?? ""}
                  alt="Your analysed portrait"
                  className="h-full w-full object-cover"
                />
              ) : (
                /* Clean Botanical Facial Zone Diagram for Development Fixtures (never a stock model pretending to be the user) */
                <div className="flex h-full w-full flex-col items-center justify-center bg-canvas p-6">
                  <svg
                    viewBox="0 0 400 480"
                    className="h-full w-full max-w-[280px] text-stone-strong"
                    role="img"
                    aria-label="Architectural facial zone diagram illustrating forehead, T-zone, periocular, and cheek regions"
                  >
                    {/* Head & Facial Contour */}
                    <ellipse
                      cx="200"
                      cy="225"
                      rx="114"
                      ry="148"
                      fill="#FFFEFA"
                      stroke="#BFB9AC"
                      strokeWidth="1.5"
                    />
                    {/* Forehead / T-Zone Guideline */}
                    <path
                      d="M118 145 Q200 118 282 145"
                      fill="none"
                      stroke="#DAD5CA"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    {/* Brows & Eyes Schematic */}
                    <path d="M132 182 Q158 172 182 180" fill="none" stroke="#686B61" strokeWidth="1.4" />
                    <path d="M218 180 Q242 172 268 182" fill="none" stroke="#686B61" strokeWidth="1.4" />
                    <ellipse cx="157" cy="197" rx="18" ry="8" fill="none" stroke="#686B61" strokeWidth="1.2" />
                    <ellipse cx="243" cy="197" rx="18" ry="8" fill="none" stroke="#686B61" strokeWidth="1.2" />
                    {/* Nose Bridge */}
                    <path d="M200 185 L200 250 Q192 258 208 258" fill="none" stroke="#686B61" strokeWidth="1.2" />
                    {/* Cheek U-Zone Guides */}
                    <ellipse
                      cx="136"
                      cy="242"
                      rx="32"
                      ry="40"
                      fill="none"
                      stroke="#DAD5CA"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <ellipse
                      cx="264"
                      cy="242"
                      rx="32"
                      ry="40"
                      fill="none"
                      stroke="#DAD5CA"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    {/* Relaxed Mouth Line */}
                    <path d="M172 302 Q200 310 228 302" fill="none" stroke="#686B61" strokeWidth="1.3" />
                    <text
                      x="200"
                      y="430"
                      textAnchor="middle"
                      fill="#565950"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      SCHEMATIC FACIAL ZONE REFERENCE
                    </text>
                  </svg>
                </div>
              )}

              {/* Detection Mask Overlay */}
              {activeMask && !masksExpired && !maskLoadFailed && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeMask.url}
                  alt={`Detection mask overlay for ${activeMask.label}`}
                  onError={() => setMaskLoadFailed(true)}
                  style={{ opacity: maskOpacity / 100 }}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
                />
              )}
            </div>

            {/* Mask Controls or Expiry Notice */}
            <div className="mt-4 border-t border-stone-border pt-3.5">
              {masksExpired || maskLoadFailed ? (
                <div className="flex items-start gap-2 rounded-editorial bg-canvas p-3 text-xs text-ink-secondary">
                  <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay" aria-hidden="true" />
                  <p>
                    Detection mask URLs from YouCam expire approximately 2 hours after task
                    completion and are no longer available for this session. Numeric scores remain
                    intact.
                  </p>
                </div>
              ) : availableMasks.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                      <Layers className="h-3.5 w-3.5 text-sage-botanical" aria-hidden="true" />
                      Detection Zone Overlays
                    </span>
                    {activeMask && (
                      <button
                        type="button"
                        onClick={() => setActiveMask(null)}
                        className="text-xs text-ink-secondary underline hover:text-ink"
                      >
                        Clear overlay
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {availableMasks.slice(0, 8).map((item) => {
                      const selected = activeMask?.label === item.label;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() =>
                            handleSelectMask(selected ? null : item.url, item.label)
                          }
                          aria-pressed={selected}
                          className={cn(
                            "min-h-[32px] rounded-editorial border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            selected
                              ? "border-forest bg-forest text-surface"
                              : "border-stone-border bg-canvas text-ink-secondary hover:border-stone-strong hover:text-ink"
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {activeMask && (
                    <div className="flex items-center gap-3 pt-1">
                      <label
                        htmlFor="mask-opacity-slider"
                        className="font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                      >
                        Overlay opacity ({maskOpacity}%)
                      </label>
                      <input
                        id="mask-opacity-slider"
                        type="range"
                        min={20}
                        max={100}
                        value={maskOpacity}
                        onChange={(e) => setMaskOpacity(Number(e.target.value))}
                        className="h-1.5 flex-1 accent-forest"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-ink-secondary">
                  No visual mask overlay URLs were returned in this task payload.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Primary Column: Overview + Priority Insights */}
        <div className="lg:col-span-7">
          <SkinInsightsOverview
            result={result}
            scoreBasis={scoreBasis}
            onScoreBasisChange={setScoreBasis}
            onSelectMask={handleSelectMask}
          />
        </div>
      </div>

      {/* Grouped Measured Metrics Ledger */}
      <div className="space-y-8">
        <div className="border-b border-stone-border pb-3">
          <p className="eyebrow-label text-sage-botanical">Measured Dimensions</p>
          <h3 className="mt-1.5 font-serif text-display-sm font-normal text-ink">
            Returned skin characteristics ({result.metrics.length} measured)
          </h3>
          <p className="mt-1 text-sm text-ink-secondary">
            Expand any metric to compare consumer UI and raw model values, regional sub-scores, and
            optical limitations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {ORDERED_GROUPS.map((groupKey) => {
            const groupMetrics = result.metrics.filter((m) => m.group === groupKey);
            if (groupMetrics.length === 0) return null;

            const groupInfo = CONCERN_GROUP_LABELS[groupKey];

            return (
              <section
                key={groupKey}
                aria-label={groupInfo.title}
                className="rounded-editorial border border-stone-border bg-surface p-5 sm:p-6"
              >
                <div className="border-b border-stone-border pb-3.5">
                  <h4 className="font-serif text-xl text-ink">{groupInfo.title}</h4>
                  <p className="mt-1 text-xs text-ink-secondary">{groupInfo.subtitle}</p>
                </div>

                <div>
                  {groupMetrics.map((metric) => (
                    <SkinMetric
                      key={metric.key}
                      metric={metric}
                      scoreBasis={scoreBasis}
                      activeMaskUrl={activeMask?.url ?? null}
                      onSelectMask={handleSelectMask}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Honest Representation of Unreturned / Missing Concerns */}
        {result.unavailableConcerns.length > 0 && (
          <section
            aria-label="Unreturned or unmeasured skin concerns"
            className="rounded-editorial border border-dashed border-stone-strong bg-canvas-subtle/55 p-5 sm:p-6"
          >
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
              <div>
                <h4 className="font-serif text-lg text-ink">
                  Unreturned or unrequested fields ({result.unavailableConcerns.length})
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                  These fields were not present in the API response. Dew &amp; Form lists them
                  separately rather than defaulting missing values to zero or implying a negative
                  reading.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.unavailableConcerns.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-3 py-1 text-xs text-ink-secondary"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] uppercase text-ink-muted">
                    &middot; {item.reason === "not_requested" ? "Not requested" : "Not returned"}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Routine Builder & Theme Selection — Explicitly Separated from Measured Results */}
      <section
        aria-labelledby="next-steps-heading"
        className="rounded-editorial border-t-2 border-forest bg-surface p-6 shadow-none ring-1 ring-stone-border sm:p-8"
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow-label text-sage-botanical">
              Routine Builder &middot; Non-Diagnostic Guidance
            </p>
            <h3
              id="next-steps-heading"
              className="mt-2 font-serif text-display-sm font-normal text-ink"
            >
              Shape a calm morning &amp; evening routine around your priorities
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Choose one or more care priorities—whether suggested from your scan or adjusted
              manually—to generate a structured AM/PM step guide, layering cautions, and
              automatically filtered INCI formulations below.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Note: Camera observations are cosmetic surface cues and cannot diagnose dermatological
              conditions, barrier damage, or allergies. Consult a dermatologist for persistent skin
              concerns.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.keys(CARE_THEME_METADATA) as CareFocusTheme[]).map((themeKey) => {
                const theme = CARE_THEME_METADATA[themeKey];
                const isSelected = selectedThemes.includes(themeKey);

                return (
                  <button
                    key={themeKey}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggleTheme(themeKey)}
                    className={cn(
                      "flex flex-col items-start rounded-editorial border p-4 text-left transition-colors duration-150",
                      isSelected
                        ? "border-forest bg-sage-soft/70"
                        : "border-stone-border bg-canvas hover:border-stone-strong"
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{theme.label}</span>
                      <span
                        className={cn(
                          "rounded-editorial px-2 py-0.5 font-mono text-[10px] uppercase",
                          isSelected
                            ? "bg-forest text-surface"
                            : "border border-stone-border bg-surface text-ink-muted"
                        )}
                      >
                        {isSelected ? "Active" : "Add"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                      {theme.summary}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-sage-botanical">
                      Key INCI: {theme.commonlyExploredIngredients.slice(0, 3).join(", ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic AM / PM Step-by-Step Routine Blueprint */}
        {routineBlueprint ? (
          <div className="mt-8 space-y-6 border-t border-stone-border pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                  Suggested AM / PM Routine Structure
                </p>
                <h4 className="mt-1 font-serif text-xl text-ink">
                  Tailored for{" "}
                  {selectedThemes.map((t) => CARE_THEME_METADATA[t].label).join(" + ")}
                </h4>
              </div>
              <span className="font-mono text-[11px] text-ink-muted">
                Select any step to filter matching formulations below
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Morning (AM) Ledger */}
              <div className="rounded-editorial border border-stone-border bg-canvas p-5">
                <div className="flex items-center justify-between border-b border-stone-border pb-3">
                  <span className="inline-flex items-center gap-2 font-serif text-lg text-ink">
                    <Sun className="h-4 w-4 text-clay" aria-hidden="true" />
                    <span>Morning Routine (AM)</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Hydrate &amp; Protect
                  </span>
                </div>

                <ol className="mt-4 space-y-4">
                  {routineBlueprint.morningSteps.map((step) => (
                    <li
                      key={`am-${step.stepNumber}`}
                      className="border-b border-stone-border/70 pb-3.5 last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-forest">
                            {step.stepNumber}
                          </span>
                          <span className="text-sm font-medium text-ink">{step.stepTitle}</span>
                        </div>
                        <span className="rounded-editorial border border-stone-border bg-surface px-2 py-0.5 font-mono text-[10px] text-ink-secondary">
                          {step.cadenceBadge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                        {step.guidance}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-sage-botanical">
                          Look for: {step.suggestedInci.join(", ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleJumpToStepCategory(step.targetCategory)}
                          className="text-[11px] font-medium text-forest underline decoration-forest/35 underline-offset-4 hover:text-forest-hover"
                        >
                          Browse {step.targetCategory} &darr;
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Evening (PM) Ledger */}
              <div className="rounded-editorial border border-stone-border bg-canvas p-5">
                <div className="flex items-center justify-between border-b border-stone-border pb-3">
                  <span className="inline-flex items-center gap-2 font-serif text-lg text-ink">
                    <Moon className="h-4 w-4 text-forest" aria-hidden="true" />
                    <span>Evening Routine (PM)</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Treat &amp; Replenish
                  </span>
                </div>

                <ol className="mt-4 space-y-4">
                  {routineBlueprint.eveningSteps.map((step) => (
                    <li
                      key={`pm-${step.stepNumber}`}
                      className="border-b border-stone-border/70 pb-3.5 last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-forest">
                            {step.stepNumber}
                          </span>
                          <span className="text-sm font-medium text-ink">{step.stepTitle}</span>
                        </div>
                        <span className="rounded-editorial border border-stone-border bg-surface px-2 py-0.5 font-mono text-[10px] text-ink-secondary">
                          {step.cadenceBadge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                        {step.guidance}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-sage-botanical">
                          Look for: {step.suggestedInci.join(", ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleJumpToStepCategory(step.targetCategory)}
                          className="text-[11px] font-medium text-forest underline decoration-forest/35 underline-offset-4 hover:text-forest-hover"
                        >
                          Browse {step.targetCategory} &darr;
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Layering & Pacing Cautions */}
            <div className="rounded-editorial border border-stone-border bg-canvas p-4 sm:p-5">
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-sage-botanical"
                  aria-hidden="true"
                />
                <div className="space-y-1.5 text-xs leading-relaxed text-ink-secondary">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink">
                    Layering &amp; Pacing Notes
                  </p>
                  <ul className="space-y-1">
                    {routineBlueprint.layeringCautions.map((caution) => (
                      <li key={caution}>&bull; {caution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer CTA */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-border pt-4">
          <p className="text-xs text-ink-secondary">
            {selectedThemes.length > 0
              ? `Formulations below are automatically filtered & ranked for your ${selectedThemes.length} active routine ${selectedThemes.length === 1 ? "priority" : "priorities"}.`
              : "Select one or more routine priorities above to generate an AM/PM step guide and auto-filter matching formulations."}
          </p>

          <a
            href="#discovery"
            onClick={() => onSelectRoutineCategory?.("All")}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
          >
            <span>
              {selectedThemes.length > 0
                ? "View matching formulations"
                : "Explore formulations & ingredients"}
            </span>
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}

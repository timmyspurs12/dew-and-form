"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Scale,
  ScanFace,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingTourProps {
  /** Monotonic counter incremented when user explicitly clicks "Take a tour" */
  replayGeneration: number;
  onSkip: () => void;
  onFinish: () => void;
  onNavigateToAnalysis: () => void;
  onNavigateToDiscovery: () => void;
  onNavigateToComparison: () => void;
  onOpenIngredientsWorkspace: () => void;
}

interface OnboardingStepConfig {
  stepNumber: number;
  shortTitle: string;
  eyebrow: string;
  heading: string;
  supportingText: string;
  detailText: string;
  destinationNote: string;
  imageSrc: string;
  imageAlt: string;
  plateCaption: string;
}

const ONBOARDING_STEPS: readonly OnboardingStepConfig[] = [
  {
    stepNumber: 1,
    shortTitle: "Welcome",
    eyebrow: "Guided Studio Introduction",
    heading: "Welcome to Dew & Form",
    supportingText:
      "Find your skin’s kind of care. Understand your skin, explore skincare products, and learn what goes into your routine.",
    detailText:
      "Take a brief four-part walk through the studio, jump straight into any workspace below, or continue browsing the page at your own pace.",
    destinationNote: "4-step overview · Non-blocking studio guide",
    imageSrc: "/images/editorial-hero.jpg",
    imageAlt:
      "Frosted apothecary dropper bottle, honed travertine slab, and clear botanical serum droplet in soft daylight.",
    plateCaption: "Plate 01 · Observation before recommendation.",
  },
  {
    stepNumber: 2,
    shortTitle: "Understand your skin",
    eyebrow: "Step 02 · Optical Skin Observation",
    heading: "Understand your skin",
    supportingText:
      "Submit a clear, front-facing daylight face photo in the Skin Analysis Workspace for AI-assisted skin analysis powered by YouCam AI Skin Analysis v2.1.",
    detailText:
      "Results depend on the submitted image—such as even lighting, face framing distance, and unobstructed cheeks and forehead—as well as the Standard (SD) or High-Definition (HD) analysis features supported by the integration.",
    destinationNote: "Destination: Skin Analysis Workspace (#analysis)",
    imageSrc: "/images/editorial-botanical.jpg",
    imageAlt:
      "Close-up study of translucent hydrating gel-cream texture and water droplets across warm stone.",
    plateCaption: "Plate 02 · 1–100 optical condition index & regional zone overlays.",
  },
  {
    stepNumber: 3,
    shortTitle: "Discover skincare",
    eyebrow: "Step 03 · Formulations & Comparison",
    heading: "Discover skincare",
    supportingText:
      "Search and filter available skincare products from the public Open Beauty Facts registry and reference archetypes by category, key ingredient, label attributes, or routine priorities.",
    detailText:
      "Select two or three products using Compare on any card to evaluate functional ingredient roles, shared INCI overlap, routine step, and disclosed price side by side—without synthetic match scores.",
    destinationNote: "Destination: Formulation Discovery (#discovery) & Comparison (#comparison)",
    imageSrc: "/images/vessel-emulsion.jpg",
    imageAlt:
      "Unbranded ceramic and frosted glass skincare emulsion vessels arranged in quiet morning light.",
    plateCaption: "Plate 03 · Side-by-side comparison without manufactured winners.",
  },
  {
    stepNumber: 4,
    shortTitle: "INCI literacy",
    eyebrow: "Step 04 · INCI Literacy",
    heading: "Explore ingredients",
    supportingText:
      "Use the INCI Ingredient Workspace to inspect cosmetic ingredients, documented European Commission CosIng functional roles, and published CIR evidence summaries.",
    detailText:
      "Review 22 ingredient monographs—including what standard labels omit, such as exact active percentages and pH—or paste an INCI list from a product on your own shelf.",
    destinationNote: "Destination: Cosmetic Ingredient Monographs drawer & Shelf Inspector",
    imageSrc: "/images/vessel-cleanser.jpg",
    imageAlt:
      "Minimal apothecary cleanser vessel beside honed travertine stone in diffused daylight.",
    plateCaption: "Plate 04 · Documented CosIng roles & label limitations.",
  },
] as const;

const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function OnboardingTour({
  replayGeneration,
  onSkip,
  onFinish,
  onNavigateToAnalysis,
  onNavigateToDiscovery,
  onNavigateToComparison,
  onOpenIngredientsWorkspace,
}: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const actionCommittedRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const stepButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Focus the onboarding heading only when explicitly replayed via "Take a tour"
  useEffect(() => {
    if (replayGeneration > 0) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [replayGeneration]);

  const safeStepIndex = Math.min(Math.max(stepIndex, 0), TOTAL_STEPS - 1);
  const currentStep = ONBOARDING_STEPS[safeStepIndex];
  const progressPercentage = ((safeStepIndex + 1) / TOTAL_STEPS) * 100;

  const goToStep = (nextIndex: number) => {
    if (actionCommittedRef.current) return;
    const clamped = Math.min(Math.max(nextIndex, 0), TOTAL_STEPS - 1);
    setStepIndex(clamped);
  };

  const runTerminalAction = (callback: () => void) => {
    if (actionCommittedRef.current) return;
    actionCommittedRef.current = true;
    callback();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      runTerminalAction(onSkip);
    }
  };

  const handleStepPillKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    let targetIdx: number | null = null;
    if (event.key === "ArrowRight") {
      targetIdx = (idx + 1) % TOTAL_STEPS;
    } else if (event.key === "ArrowLeft") {
      targetIdx = (idx - 1 + TOTAL_STEPS) % TOTAL_STEPS;
    } else if (event.key === "Home") {
      targetIdx = 0;
    } else if (event.key === "End") {
      targetIdx = TOTAL_STEPS - 1;
    }

    if (targetIdx !== null) {
      event.preventDefault();
      goToStep(targetIdx);
      stepButtonRefs.current[targetIdx]?.focus();
    }
  };

  return (
    <section
      id="onboarding-guide"
      aria-label="Dew & Form guided introduction"
      onKeyDown={handleKeyDown}
      className="border-b border-stone-border bg-sage-soft/45 py-6 sm:py-8 lg:py-10"
    >
      <div className="editorial-container">
        <div className="overflow-hidden rounded-editorial border border-stone-strong/80 bg-surface">
          {/* Top Progress & Step Navigation Bar */}
          <div className="border-b border-stone-border bg-canvas/80 px-5 py-3.5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-forest">
                  Studio Guide
                </span>
                <span
                  aria-live="polite"
                  className="rounded-editorial border border-stone-border bg-surface px-2.5 py-0.5 font-mono text-[11px] font-medium text-ink"
                >
                  {safeStepIndex + 1} of {TOTAL_STEPS}
                </span>
              </div>

              {/* Accessible Step Indicators */}
              <ol
                aria-label="Onboarding steps"
                className="flex flex-wrap items-center gap-1.5"
              >
                {ONBOARDING_STEPS.map((step, idx) => {
                  const isCurrent = idx === safeStepIndex;
                  const isVisited = idx < safeStepIndex;

                  return (
                    <li key={step.stepNumber}>
                      <button
                        ref={(el) => {
                          stepButtonRefs.current[idx] = el;
                        }}
                        type="button"
                        onClick={() => goToStep(idx)}
                        onKeyDown={(e) => handleStepPillKeyDown(e, idx)}
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={`Step ${step.stepNumber} of ${TOTAL_STEPS}: ${step.shortTitle}`}
                        className={cn(
                          "inline-flex min-h-[34px] items-center gap-1.5 rounded-editorial border px-2.5 py-1 text-xs transition-colors duration-150 motion-reduce:transition-none",
                          isCurrent
                            ? "border-forest bg-forest font-medium text-surface"
                            : isVisited
                              ? "border-sage-muted bg-sage-soft/75 text-forest hover:border-forest"
                              : "border-stone-border bg-surface text-ink-secondary hover:border-stone-strong hover:text-ink"
                        )}
                      >
                        <span className="font-mono text-[10px]">
                          0{step.stepNumber}
                        </span>
                        <span className="hidden sm:inline">{step.shortTitle}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <button
                type="button"
                onClick={() => runTerminalAction(onSkip)}
                aria-label="Dismiss guided introduction"
                className="inline-flex h-9 w-9 items-center justify-center rounded-editorial border border-stone-border bg-surface text-ink-secondary transition-colors hover:border-stone-strong hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Subtle Linear Progress Hairline */}
            <div
              role="progressbar"
              aria-label="Onboarding progress"
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={safeStepIndex + 1}
              className="mt-3 h-[2px] w-full overflow-hidden bg-stone-border"
            >
              <div
                style={{ width: `${progressPercentage}%` }}
                className="h-full bg-forest transition-all duration-300 ease-editorial motion-reduce:transition-none"
              />
            </div>
          </div>

          {/* Main Asymmetric Editorial Body */}
          <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:gap-10 lg:p-10">
            {/* Step Copy & Action Controls (7 columns on desktop) */}
            <div className="flex flex-col justify-between lg:col-span-7">
              <div>
                <p className="eyebrow-label text-sage-botanical">{currentStep.eyebrow}</p>

                <h2
                  id="onboarding-step-heading"
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-2.5 font-serif text-display-md font-normal text-ink focus:outline-none"
                >
                  {currentStep.heading}
                </h2>

                <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-ink sm:text-[1.05rem]">
                  {currentStep.supportingText}
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary">
                  {currentStep.detailText}
                </p>

                <p className="mt-4 inline-flex items-center rounded-editorial border border-stone-border bg-canvas px-3 py-1 font-mono text-[11px] text-ink-secondary">
                  {currentStep.destinationNote}
                </p>
              </div>

              {/* Step-Specific Controls */}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-stone-border pt-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  {safeStepIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => goToStep(safeStepIndex - 1)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-canvas px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Back</span>
                    </button>
                  )}

                  {/* Step 1 Controls */}
                  {safeStepIndex === 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
                      >
                        <span>Get started</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => runTerminalAction(onSkip)}
                        className="inline-flex min-h-[44px] items-center rounded-editorial border border-stone-strong bg-surface px-4 py-2.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-canvas hover:text-ink"
                      >
                        Skip intro
                      </button>
                    </>
                  )}

                  {/* Step 2 Controls */}
                  {safeStepIndex === 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => runTerminalAction(onNavigateToAnalysis)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
                      >
                        <ScanFace className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Analyse my skin</span>
                        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-surface px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
                      >
                        <span>Next</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  )}

                  {/* Step 3 Controls */}
                  {safeStepIndex === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={() => runTerminalAction(onNavigateToDiscovery)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
                      >
                        <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Explore products</span>
                        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-surface px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
                      >
                        <span>Next</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  )}

                  {/* Step 4 Controls */}
                  {safeStepIndex === 3 && (
                    <>
                      <button
                        type="button"
                        onClick={() => runTerminalAction(onOpenIngredientsWorkspace)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Explore ingredients</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => runTerminalAction(onFinish)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-surface px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
                      >
                        <Check className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                        <span>Finish</span>
                      </button>
                    </>
                  )}
                </div>

                {safeStepIndex > 0 && safeStepIndex < TOTAL_STEPS - 1 && (
                  <button
                    type="button"
                    onClick={() => runTerminalAction(onSkip)}
                    className="min-h-[38px] px-2 text-xs font-medium text-ink-secondary underline decoration-stone-strong underline-offset-4 transition-colors hover:text-ink"
                  >
                    Skip intro
                  </button>
                )}
              </div>
            </div>

            {/* Editorial Visual Plate (5 columns on desktop) */}
            <div className="lg:col-span-5">
              <figure className="rounded-editorial border border-stone-border bg-canvas p-3">
                <div className="aspect-[16/10] w-full overflow-hidden bg-canvas-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentStep.imageSrc}
                    alt={currentStep.imageAlt}
                    className="h-full w-full object-cover transition-opacity duration-200 motion-reduce:transition-none"
                  />
                </div>
                <figcaption className="mt-2.5 flex items-center justify-between gap-3 text-xs text-ink-secondary">
                  <span>{currentStep.plateCaption}</span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    0{currentStep.stepNumber} / 0{TOTAL_STEPS}
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>

          {/* Direct Workspace Launcher Strip — Available at Every Stage */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-border bg-canvas/70 px-5 py-3 sm:px-7">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Or jump directly to a workspace:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runTerminalAction(onNavigateToAnalysis)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-forest hover:bg-sage-soft/50"
              >
                <ScanFace className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                <span>Skin Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => runTerminalAction(onNavigateToDiscovery)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-forest hover:bg-sage-soft/50"
              >
                <Scale className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                <span>Products &amp; Compare</span>
              </button>

              <button
                type="button"
                onClick={() => runTerminalAction(onNavigateToComparison)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-forest hover:text-ink"
              >
                <span>Comparison Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => runTerminalAction(onOpenIngredientsWorkspace)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-forest hover:bg-sage-soft/50"
              >
                <BookOpen className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                <span>INCI Monographs</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

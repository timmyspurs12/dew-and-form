"use client";

import React, { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ClipboardList,
  Scale,
  ScanFace,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingTourProps {
  open: boolean;
  onSkip: () => void;
  onFinish: () => void;
  onNavigateToAnalysis: () => void;
  onNavigateToDiscovery: () => void;
  onOpenIngredientsWorkspace: () => void;
  onOpenShelfInspector: () => void;
}

interface OnboardingHighlight {
  code: string;
  text: string;
}

interface OnboardingStepConfig {
  stepNumber: number;
  navLabel: string;
  ariaStepTitle: string;
  eyebrow: string;
  heading: string;
  description: string;
  supportingDetail: string;
  highlights: readonly OnboardingHighlight[];
  imageSrc: string;
  imageAlt: string;
  plateCode: string;
  plateCaption: string;
}

const ONBOARDING_STEPS: readonly OnboardingStepConfig[] = [
  {
    stepNumber: 1,
    navLabel: "Welcome",
    ariaStepTitle: "Welcome to Dew & Form",
    eyebrow: "Step 01 — Welcome to Dew & Form",
    heading: "Find your skin’s kind of care.",
    description:
      "Dew & Form brings together optical skin observation, public ingredient records, and calm side-by-side comparison so you can understand your skin, explore skincare products, and make more informed routine decisions.",
    supportingDetail:
      "Use Next below to preview each studio workspace in place, or skip straight to the website whenever you are ready.",
    highlights: [
      {
        code: "01",
        text: "Observe visible complexion characteristics from a clear daylight portrait.",
      },
      {
        code: "02",
        text: "Explore real skincare formulations and compare disclosed product details.",
      },
      {
        code: "03",
        text: "Inspect INCI ingredient lists, documented roles, and label limitations.",
      },
    ],
    imageSrc: "/images/editorial-hero.jpg",
    imageAlt:
      "Frosted apothecary dropper bottle, honed travertine slab, and clear botanical serum droplet in soft daylight.",
    plateCode: "Plate 01",
    plateCaption: "Observation before recommendation.",
  },
  {
    stepNumber: 2,
    navLabel: "Skin Analysis",
    ariaStepTitle: "Skin Analysis",
    eyebrow: "Step 02 — Skin Analysis",
    heading: "Skin Analysis",
    description:
      "Upload a clear, front-facing daylight face photo in the Skin Analysis Workspace to receive AI-assisted skin-analysis results through Dew & Form’s server-proxied YouCam AI Skin Analysis v2.1 integration.",
    supportingDetail:
      "Reviewing visible complexion cues—such as overall skin type, oiliness, pores, radiance, and facial zone overlays—helps you explore where to focus your routine. Readings are non-clinical optical estimates shaped by image lighting, framing, and supported SD or HD actions.",
    highlights: [
      {
        code: "SD / HD",
        text: "Choose Standard or High-Definition optical portrait evaluation before submitting.",
      },
      {
        code: "ZONES",
        text: "Inspect returned 1–100 condition indices, zone masks, and suggested AM/PM care themes.",
      },
    ],
    imageSrc: "/images/editorial-botanical.jpg",
    imageAlt:
      "Close-up study of translucent hydrating gel-cream texture and water droplets across warm stone.",
    plateCode: "Plate 02",
    plateCaption: "Daylight portrait scan via YouCam AI Skin Analysis v2.1.",
  },
  {
    stepNumber: 3,
    navLabel: "Discovery",
    ariaStepTitle: "Product Discovery & Comparison",
    eyebrow: "Step 03 — Product Discovery & Comparison",
    heading: "Product Discovery & Comparison",
    description:
      "Discover skincare formulations from the Open Beauty Facts registry and non-commercial reference archetypes by category, keyword, barcode, label attributes, or routine care themes.",
    supportingDetail:
      "Select up to three products with Compare on any card to review the information actually available—including declared INCI lists, shared ingredients, functional roles, routine step, and disclosed price when listed—without synthetic match scores.",
    highlights: [
      {
        code: "SEARCH",
        text: "Filter by cleanser, serum, treatment, moisturiser, or fragrance-free label tags.",
      },
      {
        code: "COMPARE",
        text: "Evaluate 2–3 formulations side by side in the Comparison Matrix.",
      },
    ],
    imageSrc: "/images/vessel-emulsion.jpg",
    imageAlt:
      "Unbranded ceramic and frosted glass skincare emulsion vessels arranged in quiet morning light.",
    plateCode: "Plate 03",
    plateCaption: "Transparent formulation discovery & side-by-side ledger.",
  },
  {
    stepNumber: 4,
    navLabel: "Ingredients",
    ariaStepTitle: "Ingredient Explorer & Product Check",
    eyebrow: "Step 04 — Ingredient Explorer & Product Check",
    heading: "Ingredient Explorer & Product Check",
    description:
      "Inspect INCI ingredient lists, understand documented European Commission CosIng functions and CIR evidence summaries, and evaluate whether a formulation aligns with your routine focus areas when sufficient product data is available.",
    supportingDetail:
      "Browse 22 reference monographs in the Ingredient Explorer, or paste a label INCI declaration into the Shelf INCI Inspector to check a product you already own—while seeing clearly what standard labels omit, such as exact active percentages and pH.",
    highlights: [
      {
        code: "INCI",
        text: "Search documented humectants, barrier lipids, soothing agents, and exfoliants.",
      },
      {
        code: "SHELF",
        text: "Paste a product’s packaging INCI list to parse recognised actives and compare it.",
      },
    ],
    imageSrc: "/images/vessel-cleanser.jpg",
    imageAlt:
      "Minimal apothecary cleanser vessel beside honed travertine stone in diffused daylight.",
    plateCode: "Plate 04",
    plateCaption: "CosIng ingredient monographs & shelf INCI inspection.",
  },
] as const;

const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function OnboardingTour({
  open,
  onSkip,
  onFinish,
  onNavigateToAnalysis,
  onNavigateToDiscovery,
  onOpenIngredientsWorkspace,
  onOpenShelfInspector,
}: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const actionCommittedRef = useRef(false);
  const suppressCloseAutoFocusRef = useRef(false);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const stepButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);

  const safeStepIndex = Math.min(Math.max(stepIndex, 0), TOTAL_STEPS - 1);
  const currentStep = ONBOARDING_STEPS[safeStepIndex];
  const progressPercentage = ((safeStepIndex + 1) / TOTAL_STEPS) * 100;

  const goToStep = (nextIndex: number) => {
    if (actionCommittedRef.current) return;
    const clamped = Math.min(Math.max(nextIndex, 0), TOTAL_STEPS - 1);
    setStepIndex(clamped);
    if (scrollBodyRef.current && typeof scrollBodyRef.current.scrollTo === "function") {
      scrollBodyRef.current.scrollTo({ top: 0 });
    }
  };

  const commitDismissal = (callback: () => void, isDirectFeatureJump = false) => {
    if (!open || actionCommittedRef.current) return;
    actionCommittedRef.current = true;
    suppressCloseAutoFocusRef.current = isDirectFeatureJump;
    setStepIndex(0);
    callback();
    window.setTimeout(() => {
      actionCommittedRef.current = false;
    }, 0);
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
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          commitDismissal(onSkip, false);
        }
      }}
    >
      <Dialog.Portal>
        {/* Translucent Dark Botanical Overlay with Lightweight CSS Backdrop Blur */}
        <Dialog.Overlay
          data-testid="onboarding-modal-backdrop"
          className="onboarding-overlay-animate fixed inset-0 z-50 bg-[#1B241E]/55 backdrop-blur-[6px]"
        />

        {/* Crisp Flex Centering Viewport (avoids subpixel translate(-50%,-50%) text blur) */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <Dialog.Content
            id="onboarding-guide-modal"
            onOpenAutoFocus={(event) => {
              if (nextButtonRef.current) {
                event.preventDefault();
                nextButtonRef.current.focus();
              }
            }}
            onCloseAutoFocus={(event) => {
              if (suppressCloseAutoFocusRef.current) {
                event.preventDefault();
                suppressCloseAutoFocusRef.current = false;
              }
            }}
            className="onboarding-modal-animate pointer-events-auto relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[880px] flex-col overflow-hidden rounded-subtle border border-stone-strong/85 bg-surface text-ink shadow-[0_24px_64px_-16px_rgba(22,30,25,0.34)] focus:outline-none sm:max-h-[min(88dvh,680px)]"
          >
            {/* Pinned Top Header: Studio Label, Step Count, Step Indicators, Close Button & Progress Bar */}
            <div className="shrink-0 border-b border-stone-border bg-canvas px-4 py-3 sm:px-6 sm:py-3.5">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-forest">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Dew &amp; Form</span>
                  </span>
                  <span
                    aria-live="polite"
                    className="rounded-editorial border border-stone-border bg-surface px-2.5 py-0.5 font-mono text-[11px] font-medium text-ink"
                  >
                    Step {safeStepIndex + 1} of {TOTAL_STEPS}
                  </span>
                </div>

                {/* Accessible Step Indicator Pills */}
                <ol
                  aria-label="Onboarding tour steps"
                  className="flex items-center gap-1 sm:gap-1.5"
                >
                  {ONBOARDING_STEPS.map((step, idx) => {
                    const isCurrent = idx === safeStepIndex;
                    const isCompleted = idx < safeStepIndex;

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
                          aria-label={`Step ${step.stepNumber} of ${TOTAL_STEPS}: ${step.ariaStepTitle}`}
                          className={cn(
                            "inline-flex min-h-[34px] items-center gap-1.5 rounded-editorial border px-2 py-1 text-xs transition-colors duration-150 sm:px-2.5",
                            isCurrent
                              ? "border-forest bg-forest font-medium text-surface"
                              : isCompleted
                                ? "border-sage-muted bg-sage-soft text-forest hover:border-forest"
                                : "border-stone-border bg-surface text-ink-secondary hover:border-stone-strong hover:text-ink"
                          )}
                        >
                          <span className="font-mono text-[10px]">
                            0{step.stepNumber}
                          </span>
                          <span className="hidden lg:inline">{step.navLabel}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>

                {/* Visible Close Button */}
                <button
                  type="button"
                  onClick={() => commitDismissal(onSkip, false)}
                  aria-label="Close onboarding tour"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-editorial border border-stone-border bg-surface text-ink-secondary transition-colors hover:border-stone-strong hover:bg-sage-soft/50 hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Linear Progress Indicator */}
              <div
                role="progressbar"
                aria-label="Onboarding progress"
                aria-valuemin={1}
                aria-valuemax={TOTAL_STEPS}
                aria-valuenow={safeStepIndex + 1}
                className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-stone-border/80"
              >
                <div
                  style={{ width: `${progressPercentage}%` }}
                  className="h-full bg-forest transition-all duration-300 ease-editorial motion-reduce:transition-none"
                />
              </div>
            </div>

            {/* Scrollable Responsive Editorial Body */}
            <div
              ref={scrollBodyRef}
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              <div
                key={safeStepIndex}
                className="onboarding-step-animate grid grid-cols-1 md:grid-cols-12"
              >
                {/* Left Visual Plate Column (5 cols on tablet/desktop) */}
                <div className="flex flex-col justify-between border-b border-stone-border bg-canvas-subtle p-4 sm:p-5 md:col-span-5 md:border-b-0 md:border-r md:p-6">
                  <figure className="space-y-3">
                    <div className="aspect-[16/9] w-full overflow-hidden rounded-editorial border border-stone-border bg-canvas sm:aspect-[21/10] md:aspect-[4/4.2]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentStep.imageSrc}
                        alt={currentStep.imageAlt}
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <figcaption className="flex items-center justify-between gap-2 text-xs text-ink-secondary">
                      <span className="leading-snug">{currentStep.plateCaption}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                        {currentStep.plateCode}
                      </span>
                    </figcaption>
                  </figure>

                  <div className="mt-4 hidden rounded-editorial border border-stone-border bg-surface/90 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-secondary md:block">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-forest">
                      Studio Note
                    </span>
                    <p className="mt-0.5">
                      Non-clinical cosmetic guidance &middot; Reopen anytime via{" "}
                      <span className="font-medium text-ink">Take a tour</span> in the header.
                    </p>
                  </div>
                </div>

                {/* Right Editorial Typography & Feature Introduction Column (7 cols on tablet/desktop) */}
                <div className="flex flex-col justify-between p-5 sm:p-6 md:col-span-7 md:p-7">
                  <div>
                    <p className="eyebrow-label text-sage-botanical">
                      {currentStep.eyebrow}
                    </p>

                    <Dialog.Title className="mt-2 font-serif text-display-sm font-normal text-ink sm:text-display-md">
                      {currentStep.heading}
                    </Dialog.Title>

                    <Dialog.Description className="mt-3 text-sm leading-relaxed text-ink sm:text-[15px]">
                      {currentStep.description}
                    </Dialog.Description>

                    <p className="mt-2.5 text-xs leading-relaxed text-ink-secondary sm:text-[13px]">
                      {currentStep.supportingDetail}
                    </p>

                    {/* Tasteful Feature Capability List */}
                    <ul className="mt-4 space-y-2 border-t border-stone-border pt-4">
                      {currentStep.highlights.map((item) => (
                        <li
                          key={item.code}
                          className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-secondary"
                        >
                          <span className="mt-0.5 inline-flex min-w-[2.5rem] shrink-0 items-center justify-center rounded-editorial bg-sage-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-forest">
                            {item.code}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Step 4 Direct-Action Shortcuts to Implemented Ingredient & Shelf Tools */}
                    {safeStepIndex === 3 && (
                      <div className="mt-5 rounded-editorial border border-sage-muted bg-sage-soft/50 p-3.5">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                          Open a workspace directly
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              commitDismissal(onOpenIngredientsWorkspace, true)
                            }
                            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-editorial border border-forest/35 bg-surface px-3.5 py-2 text-xs font-medium text-forest transition-colors hover:border-forest hover:bg-sage-soft"
                          >
                            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Open Ingredient Explorer</span>
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => commitDismissal(onOpenShelfInspector, true)}
                            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-surface px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:border-forest hover:bg-sage-soft/65"
                          >
                            <ClipboardList
                              className="h-3.5 w-3.5 text-forest"
                              aria-hidden="true"
                            />
                            <span>Inspect a Shelf Product</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Navigation Footer (Accessible on All Screen Sizes Without Clipping) */}
            <div className="shrink-0 border-t border-stone-border bg-canvas px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Left Control: Skip intro on Step 1, Back on Steps 2–4 */}
                <div>
                  {safeStepIndex === 0 ? (
                    <button
                      type="button"
                      onClick={() => commitDismissal(onSkip, false)}
                      className="inline-flex min-h-[44px] items-center rounded-editorial border border-stone-strong bg-surface px-4 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-sage-soft/50 hover:text-ink"
                    >
                      Skip intro
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => goToStep(safeStepIndex - 1)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                {/* Right Controls: Direct-Action Feature Shortcut (Steps 2–3) + Next / Finish */}
                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  {safeStepIndex === 1 && (
                    <button
                      type="button"
                      onClick={() => commitDismissal(onNavigateToAnalysis, true)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-forest/40 bg-sage-soft/75 px-4 py-2 text-xs font-medium text-forest transition-colors hover:border-forest hover:bg-sage-soft"
                    >
                      <ScanFace className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Try Skin Analysis</span>
                    </button>
                  )}

                  {safeStepIndex === 2 && (
                    <button
                      type="button"
                      onClick={() => commitDismissal(onNavigateToDiscovery, true)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-forest/40 bg-sage-soft/75 px-4 py-2 text-xs font-medium text-forest transition-colors hover:border-forest hover:bg-sage-soft"
                    >
                      <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Explore Products</span>
                    </button>
                  )}

                  {safeStepIndex < TOTAL_STEPS - 1 ? (
                    <button
                      ref={nextButtonRef}
                      type="button"
                      onClick={() => goToStep(safeStepIndex + 1)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
                    >
                      <span>Next</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => commitDismissal(onFinish, false)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Finish</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Compass, Menu, Scale, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandHeaderProps {
  hasResults: boolean;
  compareCount: number;
  activeSection?: string;
  isTourOpen?: boolean;
  onTakeTour?: () => void;
}

const NAV_ITEMS = [
  { id: "approach", label: "Approach", href: "#approach" },
  { id: "analysis", label: "Skin Analysis", href: "#analysis" },
  { id: "insights", label: "Skin Insights", href: "#insights" },
  { id: "discovery", label: "Formulations & INCI", href: "#discovery" },
  { id: "comparison", label: "Compare", href: "#comparison" },
] as const;

export function BrandHeader({
  hasResults,
  compareCount,
  activeSection,
  isTourOpen = false,
  onTakeTour,
}: BrandHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-border bg-canvas/95 backdrop-blur-sm transition-colors duration-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-editorial focus:bg-forest focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-surface"
      >
        Skip to main content
      </a>

      <div className="editorial-container flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
        {/* Brand Wordmark & Tagline */}
        <div className="flex items-baseline gap-4">
          <a
            href="#top"
            className="font-serif text-2xl tracking-tight text-ink transition-opacity duration-150 hover:opacity-80 sm:text-[1.65rem]"
          >
            Dew &amp; Form
          </a>
          <span className="hidden border-l border-stone-border pl-4 text-xs tracking-wide text-ink-secondary xl:inline-block">
            Find your skin&apos;s kind of care.
          </span>
        </div>

        {/* Desktop Compact Navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex lg:gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isInsights = item.id === "insights";
            const isCompare = item.id === "comparison";
            const isActive = activeSection === item.id;

            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative inline-flex items-center gap-1.5 rounded-editorial px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 lg:px-3",
                  isActive
                    ? "text-forest"
                    : "text-ink-secondary hover:bg-sage-soft/50 hover:text-ink"
                )}
              >
                <span>{item.label}</span>
                {isInsights && hasResults && (
                  <span
                    className="inline-flex h-1.5 w-1.5 rounded-full bg-forest"
                    aria-label="Analysis results ready"
                  />
                )}
                {isCompare && compareCount > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-editorial bg-forest px-1.5 py-0.5 font-mono text-[11px] font-medium text-surface">
                    {compareCount}
                  </span>
                )}
                <span
                  className={cn(
                    "pointer-events-none absolute inset-x-3 bottom-1 h-px bg-forest transition-transform duration-200 ease-editorial origin-left",
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
              </a>
            );
          })}

          {onTakeTour && (
            <button
              type="button"
              onClick={onTakeTour}
              aria-expanded={isTourOpen}
              aria-controls="onboarding-guide"
              className={cn(
                "ml-1 inline-flex min-h-[38px] items-center gap-1.5 rounded-editorial border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                isTourOpen
                  ? "border-forest bg-sage-soft text-forest"
                  : "border-stone-strong bg-surface text-ink-secondary hover:bg-sage-soft/55 hover:text-ink"
              )}
            >
              <Compass className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
              <span>Take a tour</span>
            </button>
          )}

          <a
            href="#analysis"
            className="ml-1.5 inline-flex items-center gap-2 rounded-editorial bg-forest px-4 py-2 text-[13px] font-medium text-surface transition-colors duration-150 hover:bg-forest-hover"
          >
            <span>Explore my skin</span>
          </a>
        </nav>

        {/* Mobile Actions & Menu Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          {compareCount > 0 && (
            <a
              href="#comparison"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-3 py-2 text-xs font-medium text-ink"
              aria-label={`Compare ${compareCount} selected products`}
            >
              <Scale className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
              <span>{compareCount}</span>
            </a>
          )}

          <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-editorial border border-stone-border bg-surface text-ink transition-colors hover:bg-sage-soft/60"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[1px]" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col justify-between border-l border-stone-border bg-canvas p-6 focus:outline-none">
                <div>
                  <div className="flex items-center justify-between border-b border-stone-border pb-4">
                    <div>
                      <Dialog.Title className="font-serif text-xl text-ink">
                        Dew &amp; Form
                      </Dialog.Title>
                      <Dialog.Description className="mt-0.5 text-xs text-ink-secondary">
                        Find your skin&apos;s kind of care.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-editorial border border-stone-border bg-surface text-ink hover:bg-sage-soft/60"
                        aria-label="Close navigation menu"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <nav aria-label="Mobile Primary" className="mt-6 flex flex-col divide-y divide-stone-border">
                    {NAV_ITEMS.map((item) => (
                      <a
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex min-h-[48px] items-center justify-between py-3 text-base font-medium text-ink transition-colors hover:text-forest"
                      >
                        <span>{item.label}</span>
                        {item.id === "insights" && hasResults && (
                          <span className="inline-flex items-center gap-1 rounded-editorial bg-sage-soft px-2 py-0.5 text-xs text-forest">
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            Ready
                          </span>
                        )}
                        {item.id === "comparison" && compareCount > 0 && (
                          <span className="rounded-editorial bg-forest px-2 py-0.5 font-mono text-xs text-surface">
                            {compareCount} selected
                          </span>
                        )}
                      </a>
                    ))}

                    {onTakeTour && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onTakeTour();
                        }}
                        className="flex min-h-[48px] w-full items-center justify-between py-3 text-left text-base font-medium text-forest transition-colors hover:text-forest-hover"
                      >
                        <span>Take a tour</span>
                        <Compass className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </nav>
                </div>

                <div className="border-t border-stone-border pt-5">
                  <a
                    href="#analysis"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-editorial bg-forest px-5 py-3 text-sm font-medium text-surface transition-colors hover:bg-forest-hover"
                  >
                    Explore my skin
                  </a>
                  <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
                    AI skin observation and documented INCI transparency. Non-clinical informational tool.
                  </p>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}

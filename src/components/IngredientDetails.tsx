"use client";

import React, { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, BookOpen, ExternalLink, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { INGREDIENT_MONOGRAPHS, parseInciDeclaration } from "@/lib/ingredients/catalog";
import type { IngredientMonograph, SkincareProduct } from "@/lib/ingredients/types";
import { CARE_THEME_METADATA, type CareFocusTheme } from "@/lib/youcam/metadata";

export interface IngredientDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: SkincareProduct | null;
  initialIngredientName?: string | null;
  selectedThemes: CareFocusTheme[];
}

export function IngredientDetails({
  open,
  onOpenChange,
  product,
  initialIngredientName,
  selectedThemes,
}: IngredientDetailsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedMonographId, setFocusedMonographId] = useState<string | null>(null);

  const parsedProductIngredients = useMemo(
    () => (product ? parseInciDeclaration(product.inciDeclaration) : []),
    [product]
  );

  // Sync initial ingredient focus when opened via an ingredient pill
  const activeMonograph: IngredientMonograph | null = useMemo(() => {
    if (focusedMonographId) {
      return INGREDIENT_MONOGRAPHS.find((m) => m.id === focusedMonographId) ?? null;
    }
    if (initialIngredientName) {
      const normalized = initialIngredientName.toLowerCase().trim();
      const match = INGREDIENT_MONOGRAPHS.find(
        (m) =>
          m.inciName.toLowerCase() === normalized ||
          m.commonName.toLowerCase() === normalized ||
          m.commonName.toLowerCase().includes(normalized)
      );
      if (match) return match;
    }
    if (parsedProductIngredients.length > 0) {
      const firstMatched = parsedProductIngredients.find((item) => item.monograph !== null);
      return firstMatched?.monograph ?? null;
    }
    return INGREDIENT_MONOGRAPHS[0] ?? null;
  }, [focusedMonographId, initialIngredientName, parsedProductIngredients]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return INGREDIENT_MONOGRAPHS;
    return INGREDIENT_MONOGRAPHS.filter(
      (m) =>
        m.inciName.toLowerCase().includes(q) ||
        m.commonName.toLowerCase().includes(q) ||
        m.statedRoles.some((r) => r.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const matchingUserThemes = useMemo(() => {
    if (!activeMonograph) return [];
    return activeMonograph.relatedThemes.filter((t) => selectedThemes.includes(t));
  }, [activeMonograph, selectedThemes]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setFocusedMonographId(null);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-stone-border bg-canvas focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-stone-border bg-surface px-6 py-5">
            <div>
              <p className="eyebrow-label text-sage-botanical">
                {product ? "Formulation & INCI Assessment" : "Documented Ingredient Reference"}
              </p>
              <Dialog.Title className="mt-1 font-serif text-2xl text-ink">
                {product ? product.name : "Cosmetic Ingredient Monographs"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-ink-secondary">
                {product
                  ? `${product.brand} · ${product.category}`
                  : "Documented functional roles (CosIng), published evidence context, and label limitations."}
              </Dialog.Description>
              {product?.sourceUrl && (
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] text-forest underline decoration-forest/35 underline-offset-2 hover:text-forest-hover"
                >
                  <span>
                    View record on Open Beauty Facts
                    {product.barcode ? ` (#${product.barcode})` : ""}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>
              )}
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-editorial border border-stone-border bg-canvas text-ink transition-colors hover:bg-sage-soft/60"
                aria-label="Close ingredient transparency panel"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {/* Non-Suitability / Non-Diagnostic Safeguard Banner */}
            <div className="rounded-editorial border border-stone-border bg-surface p-4 text-xs leading-relaxed text-ink-secondary">
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-sage-botanical"
                  aria-hidden="true"
                />
                <p>
                  <strong className="font-medium text-ink">Evidence &amp; Suitability Boundary:</strong>{" "}
                  Ingredient descriptions below reflect documented cosmetic functions rather than a
                  guarantee that a formula is safe, hypoallergenic, non-comedogenic, or suitable for
                  your skin. Patch test new products and review full packaging declarations for
                  personal allergens.
                </p>
              </div>
            </div>

            {/* Product INCI Breakdown (if inspecting a product) */}
            {product ? (
              <section aria-label="Full INCI declaration">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg text-ink">
                    Declared INCI Composition ({parsedProductIngredients.length} entries)
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Select highlighted entry to inspect
                  </span>
                </div>

                {parsedProductIngredients.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5 rounded-editorial border border-stone-border bg-surface p-4">
                    {parsedProductIngredients.map((entry) => {
                      const hasMono = Boolean(entry.monograph);
                      const isActive =
                        hasMono && activeMonograph?.id === entry.monograph?.id;

                      return hasMono ? (
                        <button
                          key={`${entry.position}-${entry.rawLabel}`}
                          type="button"
                          onClick={() => setFocusedMonographId(entry.monograph!.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-editorial border px-2.5 py-1 text-xs transition-colors",
                            isActive
                              ? "border-forest bg-forest font-medium text-surface"
                              : "border-sage-muted bg-sage-soft/55 text-ink hover:border-forest"
                          )}
                        >
                          <span className="font-mono text-[10px] opacity-75">
                            {String(entry.position).padStart(2, "0")}
                          </span>
                          <span>{entry.rawLabel}</span>
                        </button>
                      ) : (
                        <span
                          key={`${entry.position}-${entry.rawLabel}`}
                          title="Base/auxiliary INCI component — detailed monograph not in local reference index"
                          className="inline-flex items-center gap-1.5 rounded-editorial border border-dashed border-stone-border bg-canvas px-2.5 py-1 text-xs text-ink-secondary"
                        >
                          <span className="font-mono text-[10px] text-ink-muted">
                            {String(entry.position).padStart(2, "0")}
                          </span>
                          <span>{entry.rawLabel}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 rounded-editorial border border-dashed border-stone-strong bg-surface p-4 text-xs text-ink-secondary">
                    Full INCI ingredient list was not provided for this product.
                  </p>
                )}

                <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                  Dashed entries represent solvent, thickener, or preservative base components not
                  expanded in the local monograph index; standard INCI conventions list ingredients
                  above 1% in descending order by weight without disclosing exact percentages.
                </p>
              </section>
            ) : (
              /* Standalone Monograph Search Selector */
              <section aria-label="Search documented ingredients">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search INCI name or functional role (e.g. Niacinamide, Humectant, Keratolytic)…"
                    aria-label="Search documented ingredients"
                    className="min-h-[44px] w-full rounded-editorial border border-stone-strong bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted"
                  />
                </div>

                <div className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-editorial border border-stone-border bg-surface p-3">
                  {filteredCatalog.map((item) => {
                    const selected = activeMonograph?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFocusedMonographId(item.id)}
                        className={cn(
                          "rounded-editorial border px-2.5 py-1 text-xs transition-colors",
                          selected
                            ? "border-forest bg-forest font-medium text-surface"
                            : "border-stone-border bg-canvas text-ink hover:border-stone-strong"
                        )}
                      >
                        {item.commonName}
                      </button>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <p className="text-xs text-ink-secondary">
                      No monographs matched &ldquo;{searchQuery}&rdquo; in the local reference library.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Detailed Ingredient Monograph Card */}
            {activeMonograph && (
              <article
                aria-label={`Ingredient monograph for ${activeMonograph.inciName}`}
                className="space-y-5 rounded-editorial border border-stone-border bg-surface p-5 sm:p-6"
              >
                <div className="border-b border-stone-border pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-sage-botanical">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Documented Ingredient Monograph
                    </span>
                    <span className="font-mono text-xs text-ink-muted">
                      INCI: {activeMonograph.inciName}
                    </span>
                  </div>

                  <h4 className="mt-2 font-serif text-2xl text-ink">
                    {activeMonograph.commonName}
                  </h4>

                  {/* Stated Roles */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-ink-secondary">Stated formula role:</span>
                    {activeMonograph.statedRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-editorial bg-sage-soft px-2.5 py-0.5 text-xs font-medium text-forest"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 1. Documented Information */}
                <div className="space-y-3 text-sm leading-relaxed">
                  <div>
                    <h5 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                      Plain-Language Description
                    </h5>
                    <p className="mt-1 text-ink">{activeMonograph.plainDescription}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-stone-border pt-4 sm:grid-cols-2">
                    <div>
                      <h5 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                        Evidence Context
                      </h5>
                      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                        {activeMonograph.evidenceSummary}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                        Source Attribution
                      </h5>
                      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                        {activeMonograph.sourceAttribution}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Limitations & Missing Information */}
                <div className="rounded-editorial border border-stone-border bg-canvas p-4 text-xs leading-relaxed">
                  <h5 className="font-mono text-[11px] uppercase tracking-wider text-ink">
                    Limitations &amp; Missing Formulation Information
                  </h5>
                  <p className="mt-1 text-ink-secondary">{activeMonograph.limitations}</p>
                  {activeMonograph.cautionNote && (
                    <p className="mt-2 border-t border-stone-border pt-2 font-medium text-clay-deep">
                      Routine note: {activeMonograph.cautionNote}
                    </p>
                  )}
                </div>

                {/* 3. Clearly Distinguished Personalised Preference Link */}
                {matchingUserThemes.length > 0 && (
                  <div className="rounded-editorial border border-sage-muted bg-sage-soft/50 p-4 text-xs leading-relaxed text-ink">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                      Educational Context &middot; Selected Focus Preferences
                    </p>
                    <p className="mt-1 text-ink-secondary">
                      Commonly explored when focusing on{" "}
                      <strong className="font-medium text-ink">
                        {matchingUserThemes.map((t) => CARE_THEME_METADATA[t].label).join(" and ")}
                      </strong>
                      . Individual tolerance still depends on full formula architecture and patch
                      testing.
                    </p>
                  </div>
                )}
              </article>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import React, { useMemo } from "react";
import { Scale, Trash2, X } from "lucide-react";
import { isFeaturedKeyMonograph, parseInciDeclaration } from "@/lib/ingredients/catalog";
import type { SkincareProduct } from "@/lib/ingredients/types";
import { buildContextualComparisonFit } from "@/lib/product-check/evaluator";
import {
  DEFAULT_PERSONAL_PROFILE,
  type ProductCheckPersonalProfile,
} from "@/lib/product-check/types";
import { CARE_THEME_METADATA, type CareFocusTheme } from "@/lib/youcam/metadata";
import { EmptyState } from "./EmptyState";
import { formatProductPrice } from "./ProductCard";

export interface ProductComparisonProps {
  comparedProducts: SkincareProduct[];
  selectedThemes: CareFocusTheme[];
  personalProfile?: ProductCheckPersonalProfile;
  onRemoveFromCompare: (productId: string) => void;
  onClearComparison: () => void;
  onInspectProduct: (product: SkincareProduct) => void;
}

interface AnalyzedComparisonItem {
  product: SkincareProduct;
  totalInciCount: number;
  humectants: string[];
  emollientsAndLipids: string[];
  soothingAgents: string[];
  activesAndAcids: string[];
  featuredMonographNames: string[];
  canonicalSet: Set<string>;
}

function getSourceEvidenceBadge(product: SkincareProduct): string {
  if (product.provenance === "confirmed-packaging-label") {
    return "Confirmed packaging label";
  }
  if (product.sourceKind === "open-beauty-facts") {
    return "Open Beauty Facts (crowd-sourced ODbL)";
  }
  if (product.sourceKind === "reference-archetype") {
    return "Reference formulation archetype";
  }
  return "User-entered shelf record";
}

export function ProductComparison({
  comparedProducts,
  selectedThemes,
  personalProfile,
  onRemoveFromCompare,
  onClearComparison,
  onInspectProduct,
}: ProductComparisonProps) {
  const effectiveProfile = useMemo<ProductCheckPersonalProfile>(() => {
    const base = personalProfile ?? DEFAULT_PERSONAL_PROFILE;
    const mergedGoals = Array.from(new Set([...base.goals, ...selectedThemes]));
    return {
      ...base,
      goals: mergedGoals,
    };
  }, [personalProfile, selectedThemes]);

  const contextualFitNotes = useMemo(
    () => buildContextualComparisonFit(comparedProducts, effectiveProfile),
    [comparedProducts, effectiveProfile]
  );

  const analyzed = useMemo<AnalyzedComparisonItem[]>(() => {
    return comparedProducts.map((product) => {
      const parsed = parseInciDeclaration(product.inciDeclaration);
      const humectants: string[] = [];
      const emollientsAndLipids: string[] = [];
      const soothingAgents: string[] = [];
      const activesAndAcids: string[] = [];
      const featuredMonographNames: string[] = [];
      const canonicalSet = new Set<string>();

      for (const item of parsed) {
        const label = item.monograph ? item.monograph.commonName.split(" (")[0] : item.rawLabel;
        canonicalSet.add(label.toLowerCase());

        if (!item.monograph) continue;
        if (isFeaturedKeyMonograph(item.monograph)) {
          featuredMonographNames.push(label);
        }

        const roles = item.monograph.statedRoles.map((r) => r.toLowerCase());

        if (roles.some((r) => r.includes("humectant"))) {
          humectants.push(label);
        }
        if (
          roles.some((r) => r.includes("emollient")) ||
          ["ceramide-np", "cholesterol-lipids", "petrolatum", "dimethicone"].includes(
            item.monograph.id
          )
        ) {
          emollientsAndLipids.push(label);
        }
        if (
          roles.some((r) => r.includes("soothing") || r.includes("skin protecting")) ||
          ["panthenol", "bisabolol", "beta-glucan", "ectoin"].includes(item.monograph.id)
        ) {
          soothingAgents.push(label);
        }
        if (
          roles.some(
            (r) =>
              r.includes("keratolytic") ||
              r.includes("antioxidant") ||
              r.includes("uv absorber") ||
              r.includes("uv filter")
          ) ||
          [
            "niacinamide",
            "azelaic-acid",
            "retinol",
            "tranexamic-acid",
            "alpha-arbutin",
            "benzoyl-peroxide",
            "bakuchiol",
            "biomimetic-peptides",
          ].includes(item.monograph.id)
        ) {
          activesAndAcids.push(label);
        }
      }

      return {
        product,
        totalInciCount: parsed.length,
        humectants: Array.from(new Set(humectants)),
        emollientsAndLipids: Array.from(new Set(emollientsAndLipids)),
        soothingAgents: Array.from(new Set(soothingAgents)),
        activesAndAcids: Array.from(new Set(activesAndAcids)),
        featuredMonographNames: Array.from(new Set(featuredMonographNames)),
        canonicalSet,
      };
    });
  }, [comparedProducts]);

  const sharedIngredients = useMemo(() => {
    if (analyzed.length < 2) return [];
    const first = Array.from(analyzed[0].canonicalSet);
    return first.filter((ing) =>
      analyzed.slice(1).every((other) => other.canonicalSet.has(ing))
    );
  }, [analyzed]);

  const uniqueActivesByProductId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const current of analyzed) {
      const othersSet = new Set<string>();
      for (const other of analyzed) {
        if (other.product.id === current.product.id) continue;
        for (const k of other.canonicalSet) othersSet.add(k);
      }
      map[current.product.id] = current.featuredMonographNames.filter(
        (name) => !othersSet.has(name.toLowerCase())
      );
    }
    return map;
  }, [analyzed]);

  return (
    <section
      id="comparison"
      aria-labelledby="comparison-heading"
      className="border-b border-stone-border bg-surface py-16 sm:py-20 lg:py-24"
    >
      <div className="editorial-container">
        <div className="flex flex-col justify-between gap-4 border-b border-stone-border pb-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow-label text-sage-botanical">Side-by-Side Assessment</p>
            <h2
              id="comparison-heading"
              tabIndex={-1}
              className="mt-2 font-serif text-display-md font-normal text-ink focus:outline-none"
            >
              Formulation comparison
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Compare two or three formulations across INCI differences, personal goal alignment,
              sensitivity considerations, verified price/size when available, and evidence
              completeness—without declaring a universal winner.
            </p>
          </div>

          {comparedProducts.length > 0 && (
            <button
              type="button"
              onClick={onClearComparison}
              className="btn-editorial-secondary min-h-[40px] self-start px-3.5 py-2 text-xs sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear selection ({comparedProducts.length})</span>
            </button>
          )}
        </div>

        {comparedProducts.length < 2 ? (
          <div className="mt-8">
            <EmptyState
              eyebrow={
                comparedProducts.length === 1
                  ? "1 of 2 Minimum Selected"
                  : "Comparison Tray Empty"
              }
              title={
                comparedProducts.length === 1
                  ? `"${comparedProducts[0].name}" is ready—select one more formulation to compare`
                  : "Select two or three formulations above to compare them side by side"
              }
              description="Use the 'Compare' button on any formulation card—from the Open Beauty Facts INCI registry, Product Check verdicts, or reference archetypes—to inspect composition differences here."
            >
              <a
                href="#discovery"
                className="btn-editorial-primary min-h-[44px] px-5 py-2.5 text-xs"
              >
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Go to formulations</span>
              </a>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Shared Ingredients Summary Strip */}
            <div className="rounded-editorial border border-stone-border bg-canvas p-4 text-xs leading-relaxed text-ink-secondary sm:p-5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                Shared INCI Overlap Across All {comparedProducts.length} Formulas
              </span>
              <p className="mt-1 text-ink">
                {sharedIngredients.length > 0 ? (
                  <span className="capitalize">{sharedIngredients.join(", ")}</span>
                ) : (
                  "No identical INCI ingredient names detected across all selected formulations."
                )}
              </p>
            </div>

            {/* DESKTOP COMPARISON LEDGER (md and up) */}
            <div className="hidden overflow-hidden rounded-editorial border border-stone-border bg-canvas md:block">
              <div
                className="grid divide-x divide-stone-border border-b border-stone-border bg-surface"
                style={{
                  gridTemplateColumns: `220px repeat(${analyzed.length}, minmax(0, 1fr))`,
                }}
              >
                <div className="p-5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    Dimension
                  </span>
                </div>
                {analyzed.map(({ product }) => (
                  <div key={product.id} className="flex flex-col justify-between p-5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                          {product.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveFromCompare(product.id)}
                          aria-label={`Remove ${product.name} from comparison`}
                          className="rounded-editorial p-1 text-ink-muted hover:bg-canvas hover:text-ink"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <h3 className="mt-1 font-serif text-xl text-ink">{product.name}</h3>
                      <p className="mt-0.5 text-xs text-ink-secondary">{product.brand}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectProduct(product)}
                      className="mt-3 self-start text-xs font-medium text-forest underline underline-offset-4 hover:text-forest-hover"
                    >
                      Open full INCI sheet
                    </button>
                  </div>
                ))}
              </div>

              {/* Row 1: Contextual Fit Summary (Non-Universal) */}
              <ComparisonDesktopRow
                label="Contextual Fit"
                sublabel="Relative to your goals & tolerance"
                columns={analyzed.map(({ product }) => {
                  const note = contextualFitNotes.find((n) => n.productId === product.id);
                  return (
                    <p key={product.id} className="text-xs leading-relaxed text-ink">
                      {note?.contextualSummary}
                    </p>
                  );
                })}
              />

              {/* Row 2: Key INCI Differences */}
              <ComparisonDesktopRow
                label="Distinctive INCI"
                sublabel="Indexed ingredients unique in this pair"
                columns={analyzed.map(({ product }) => {
                  const unique = uniqueActivesByProductId[product.id] ?? [];
                  return (
                    <div key={product.id} className="text-xs">
                      {unique.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {unique.map((u) => (
                            <span
                              key={u}
                              className="rounded-editorial border border-sage-muted bg-sage-soft/55 px-2 py-0.5 text-[11px] font-medium text-forest"
                            >
                              {u}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-muted">
                          No unique indexed actives relative to the other selection(s)
                        </span>
                      )}
                    </div>
                  );
                })}
              />

              {/* Row 3: Potential Sensitivity Flags */}
              <ComparisonDesktopRow
                label="Sensitivity Flags"
                sublabel="Fragrance, volatile oils & strong actives"
                columns={analyzed.map(({ product }) => {
                  const note = contextualFitNotes.find((n) => n.productId === product.id);
                  const triggers = note?.sensitivityTriggers ?? [];
                  return (
                    <div key={product.id} className="text-xs">
                      {triggers.length > 0 ? (
                        <ul className="space-y-1 text-clay-deep">
                          {triggers.map((t) => (
                            <li key={t}>&bull; {t}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-forest">
                          None of the common fragrance, sulfate, or acid/retinoid flags detected
                        </span>
                      )}
                    </div>
                  );
                })}
              />

              {/* Row 4: Humectants & Barrier Lipids */}
              <ComparisonDesktopRow
                label="Hydration & Lipids"
                sublabel="Documented humectants & emollients"
                columns={analyzed.map((item) => (
                  <div key={item.product.id} className="space-y-2 text-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase text-ink-muted">
                        Humectants:{" "}
                      </span>
                      <span className="text-ink">
                        {item.humectants.length > 0 ? item.humectants.join(", ") : "None indexed"}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase text-ink-muted">
                        Lipids / Emollients:{" "}
                      </span>
                      <span className="text-ink">
                        {item.emollientsAndLipids.length > 0
                          ? item.emollientsAndLipids.join(", ")
                          : "None indexed"}
                      </span>
                    </div>
                  </div>
                ))}
              />

              {/* Row 5: Targeted Actives & Soothing */}
              <ComparisonDesktopRow
                label="Actives & Soothers"
                sublabel="Conditioning, antioxidant & keratolytic"
                columns={analyzed.map((item) => (
                  <div key={item.product.id} className="space-y-2 text-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase text-ink-muted">
                        Targeted Actives:{" "}
                      </span>
                      <span className="text-ink">
                        {item.activesAndAcids.length > 0
                          ? item.activesAndAcids.join(", ")
                          : "None indexed"}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase text-ink-muted">
                        Soothing Agents:{" "}
                      </span>
                      <span className="text-ink">
                        {item.soothingAgents.length > 0
                          ? item.soothingAgents.join(", ")
                          : "None indexed"}
                      </span>
                    </div>
                  </div>
                ))}
              />

              {/* Row 6: Goal Alignment */}
              <ComparisonDesktopRow
                label="Goal Alignment"
                sublabel="Overlap with selected goals"
                columns={analyzed.map(({ product }) => {
                  const matched = product.focusThemes.filter((t) =>
                    effectiveProfile.goals.includes(t)
                  );
                  return (
                    <div key={product.id} className="text-xs text-ink-secondary">
                      {effectiveProfile.goals.length === 0 ? (
                        <span>Select routine priorities or Product Check goals to see alignment.</span>
                      ) : matched.length > 0 ? (
                        <ul className="space-y-1 text-ink">
                          {matched.map((t) => (
                            <li key={t}>&bull; {CARE_THEME_METADATA[t].label}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>Does not specifically target your active focus goals.</span>
                      )}
                    </div>
                  );
                })}
              />

              {/* Row 7: Verified Price & Size */}
              <ComparisonDesktopRow
                label="Price & Size"
                sublabel="Shown honestly when absent"
                columns={analyzed.map(({ product }) => (
                  <div key={product.id} className="text-xs">
                    <p className="font-mono font-medium text-ink">
                      {product.price
                        ? formatProductPrice(product.price)
                        : product.sourceKind === "open-beauty-facts"
                          ? "Not listed (Open Beauty Facts ODbL)"
                          : product.sourceKind === "reference-archetype"
                            ? "Non-commercial archetype"
                            : "Not entered"}
                    </p>
                    <p className="mt-1 text-ink-secondary">
                      {product.sizeLabel ?? "Volume not specified"}
                    </p>
                  </div>
                ))}
              />

              {/* Row 8: Data Completeness & Evidence Quality */}
              <ComparisonDesktopRow
                label="Data & Evidence Quality"
                sublabel="Provenance & undisclosed variables"
                columns={analyzed.map((item) => {
                  const note = contextualFitNotes.find((n) => n.productId === item.product.id);
                  return (
                    <div
                      key={item.product.id}
                      className="space-y-1 text-xs leading-relaxed text-ink-secondary"
                    >
                      <p className="font-medium text-ink">
                        {getSourceEvidenceBadge(item.product)}
                      </p>
                      <p>{note?.dataCompletenessLabel}</p>
                      <p className="text-[11px] text-ink-muted">
                        Exact active % and final formulation pH are undisclosed on standard INCI
                        labels.
                      </p>
                    </div>
                  );
                })}
              />
            </div>

            {/* MOBILE RESPONSIVE COMPARISON CARDS (< md) */}
            <div className="space-y-4 md:hidden">
              {analyzed.map((item) => {
                const { product } = item;
                const note = contextualFitNotes.find((n) => n.productId === product.id);
                const unique = uniqueActivesByProductId[product.id] ?? [];

                return (
                  <article
                    key={product.id}
                    className="rounded-editorial border border-stone-border bg-canvas p-5"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-stone-border pb-3.5">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                          {product.category}
                        </span>
                        <h3 className="mt-1 font-serif text-xl text-ink">{product.name}</h3>
                        <p className="text-xs text-ink-secondary">{product.brand}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveFromCompare(product.id)}
                        aria-label={`Remove ${product.name} from comparison`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-editorial border border-stone-border bg-surface text-ink"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <dl className="mt-4 space-y-3 text-xs">
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          Contextual Fit
                        </dt>
                        <dd className="mt-1 leading-relaxed text-ink">
                          {note?.contextualSummary}
                        </dd>
                      </div>

                      {unique.length > 0 && (
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                            Distinctive INCI in This Selection
                          </dt>
                          <dd className="mt-1 font-medium text-forest">{unique.join(", ")}</dd>
                        </div>
                      )}

                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          Sensitivity Flags
                        </dt>
                        <dd className="mt-1 text-ink-secondary">
                          {note && note.sensitivityTriggers.length > 0
                            ? note.sensitivityTriggers.join(" · ")
                            : "No common fragrance, sulfate, or acid/retinoid flags"}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-2 border-y border-stone-border/70 py-2">
                        <dt className="text-ink-muted">Price &amp; Size</dt>
                        <dd className="font-mono font-medium text-ink">
                          {product.price ? formatProductPrice(product.price) : "Unlisted"}
                          {product.sizeLabel ? ` · ${product.sizeLabel}` : ""}
                        </dd>
                      </div>

                      <div className="text-[11px] text-ink-secondary">
                        <strong className="font-medium text-ink">
                          {getSourceEvidenceBadge(product)}:
                        </strong>{" "}
                        {note?.dataCompletenessLabel}. Active % &amp; pH undisclosed.
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ComparisonDesktopRow({
  label,
  sublabel,
  columns,
}: {
  label: string;
  sublabel: string;
  columns: React.ReactNode[];
}) {
  return (
    <div
      className="grid divide-x divide-stone-border border-b border-stone-border last:border-b-0"
      style={{
        gridTemplateColumns: `220px repeat(${columns.length}, minmax(0, 1fr))`,
      }}
    >
      <div className="bg-surface/65 p-5">
        <p className="text-xs font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">{sublabel}</p>
      </div>
      {columns.map((col, idx) => (
        <div key={idx} className="p-5">
          {col}
        </div>
      ))}
    </div>
  );
}

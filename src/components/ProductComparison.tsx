"use client";

import React, { useMemo } from "react";
import { Scale, Trash2, X } from "lucide-react";
import { parseInciDeclaration } from "@/lib/ingredients/catalog";
import type { SkincareProduct } from "@/lib/ingredients/types";
import { CARE_THEME_METADATA, type CareFocusTheme } from "@/lib/youcam/metadata";
import { EmptyState } from "./EmptyState";
import { formatProductPrice } from "./ProductCard";

export interface ProductComparisonProps {
  comparedProducts: SkincareProduct[];
  selectedThemes: CareFocusTheme[];
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
  canonicalSet: Set<string>;
}

export function ProductComparison({
  comparedProducts,
  selectedThemes,
  onRemoveFromCompare,
  onClearComparison,
  onInspectProduct,
}: ProductComparisonProps) {
  const analyzed = useMemo<AnalyzedComparisonItem[]>(() => {
    return comparedProducts.map((product) => {
      const parsed = parseInciDeclaration(product.inciDeclaration);
      const humectants: string[] = [];
      const emollientsAndLipids: string[] = [];
      const soothingAgents: string[] = [];
      const activesAndAcids: string[] = [];
      const canonicalSet = new Set<string>();

      for (const item of parsed) {
        const label = item.monograph ? item.monograph.commonName.split(" (")[0] : item.rawLabel;
        canonicalSet.add(label.toLowerCase());

        if (!item.monograph) continue;
        const roles = item.monograph.statedRoles.map((r) => r.toLowerCase());

        if (roles.some((r) => r.includes("humectant"))) {
          humectants.push(label);
        }
        if (
          roles.some((r) => r.includes("emollient")) ||
          item.monograph.id === "ceramide-np"
        ) {
          emollientsAndLipids.push(label);
        }
        if (
          roles.some((r) => r.includes("soothing") || r.includes("skin protecting")) ||
          item.monograph.id === "panthenol"
        ) {
          soothingAgents.push(label);
        }
        if (
          roles.some((r) => r.includes("keratolytic") || r.includes("antioxidant")) ||
          ["niacinamide", "azelaic-acid", "retinol", "tranexamic-acid"].includes(item.monograph.id)
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
              className="mt-2 font-serif text-display-md font-normal text-ink"
            >
              Formulation comparison
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Compare two or three formulations across functional ingredient roles, shared INCI
              overlap, routine purpose, and disclosed pricing—without synthetic compatibility scores
              or declared winners.
            </p>
          </div>

          {comparedProducts.length > 0 && (
            <button
              type="button"
              onClick={onClearComparison}
              className="inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-editorial border border-stone-strong bg-canvas px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60 sm:self-auto"
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
              description="Use the 'Compare' button on any formulation card—either from products you add from your own shelf or from the clearly marked reference INCI archetypes—to inspect composition differences here."
            >
              <a
                href="#discovery"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium text-surface transition-colors hover:bg-forest-hover"
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

              {/* Row 1: Price & Size */}
              <ComparisonDesktopRow
                label="Price & Size"
                sublabel="Shown honestly when absent"
                columns={analyzed.map(({ product }) => (
                  <div key={product.id} className="text-xs">
                    <p className="font-mono font-medium text-ink">
                      {product.price
                        ? formatProductPrice(product.price)
                        : product.sourceKind === "development-fixture"
                          ? "Unavailable (Non-commercial fixture)"
                          : "Unavailable (Not entered)"}
                    </p>
                    <p className="mt-1 text-ink-secondary">
                      {product.sizeLabel ?? "Volume not specified"}
                    </p>
                  </div>
                ))}
              />

              {/* Row 2: Routine Purpose */}
              <ComparisonDesktopRow
                label="Routine Role"
                sublabel="Stated step & texture context"
                columns={analyzed.map(({ product }) => (
                  <div key={product.id} className="text-xs leading-relaxed text-ink-secondary">
                    <p className="font-medium text-ink">{product.category}</p>
                    <p className="mt-1">
                      {product.intendedStepNote ?? product.surfacedReason}
                    </p>
                  </div>
                ))}
              />

              {/* Row 3: Humectants & Barrier Lipids */}
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

              {/* Row 4: Targeted Actives & Soothing */}
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

              {/* Row 5: Disclosed Attributes */}
              <ComparisonDesktopRow
                label="Label Attributes"
                sublabel="Declared formula traits"
                columns={analyzed.map(({ product }) => (
                  <div key={product.id} className="flex flex-wrap gap-1.5">
                    {product.attributes.length > 0 ? (
                      product.attributes.map((attr) => (
                        <span
                          key={attr}
                          className="rounded-editorial border border-stone-border bg-surface px-2 py-0.5 text-[11px] text-ink"
                        >
                          {attr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-muted">None specified</span>
                    )}
                  </div>
                ))}
              />

              {/* Row 6: User Preference Alignment (Non-scored) */}
              <ComparisonDesktopRow
                label="Selected Preferences"
                sublabel="User-selected focus overlap"
                columns={analyzed.map(({ product }) => {
                  const matched = product.focusThemes.filter((t) => selectedThemes.includes(t));
                  return (
                    <div key={product.id} className="text-xs text-ink-secondary">
                      {selectedThemes.length === 0 ? (
                        <span>No focus preferences currently selected above.</span>
                      ) : matched.length > 0 ? (
                        <ul className="space-y-1 text-ink">
                          {matched.map((t) => (
                            <li key={t}>&bull; {CARE_THEME_METADATA[t].label}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>Does not specifically target your active focus filter.</span>
                      )}
                    </div>
                  );
                })}
              />

              {/* Row 7: Undisclosed Information */}
              <ComparisonDesktopRow
                label="Missing Label Data"
                sublabel="Variables INCI lists omit"
                columns={analyzed.map((item) => (
                  <p key={item.product.id} className="text-xs leading-relaxed text-ink-secondary">
                    {item.totalInciCount} declared INCI entries; exact active weight percentages and
                    final formulation pH are not disclosed on standard INCI labels.
                  </p>
                ))}
              />
            </div>

            {/* MOBILE RESPONSIVE COMPARISON CARDS (< md — readable without tiny horizontal tables) */}
            <div className="space-y-4 md:hidden">
              {analyzed.map((item) => {
                const { product } = item;
                const matched = product.focusThemes.filter((t) => selectedThemes.includes(t));

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
                      <div className="flex justify-between gap-2 border-b border-stone-border/70 pb-2">
                        <dt className="text-ink-muted">Price</dt>
                        <dd className="font-mono font-medium text-ink">
                          {product.price
                            ? formatProductPrice(product.price)
                            : "Unavailable"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          Humectants &amp; Lipids
                        </dt>
                        <dd className="mt-1 text-ink">
                          {[...item.humectants, ...item.emollientsAndLipids].join(", ") ||
                            "None indexed"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          Actives &amp; Soothing Agents
                        </dt>
                        <dd className="mt-1 text-ink">
                          {[...item.activesAndAcids, ...item.soothingAgents].join(", ") ||
                            "None indexed"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          Attributes
                        </dt>
                        <dd className="mt-1 text-ink-secondary">
                          {product.attributes.join(" · ") || "None specified"}
                        </dd>
                      </div>

                      {selectedThemes.length > 0 && (
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                            Preference Overlap
                          </dt>
                          <dd className="mt-1 text-ink">
                            {matched.length > 0
                              ? matched.map((t) => CARE_THEME_METADATA[t].label).join(", ")
                              : "No overlap with active preference filter"}
                          </dd>
                        </div>
                      )}

                      <div className="border-t border-stone-border/70 pt-2 text-[11px] text-ink-secondary">
                        Undisclosed: Exact active percentages &amp; formulation pH are not stated in
                        standard INCI declarations.
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

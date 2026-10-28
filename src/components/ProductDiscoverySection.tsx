"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, FlaskConical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FormulationAttribute,
  FormulationCategory,
  SkincareProduct,
} from "@/lib/ingredients/types";
import { CARE_THEME_METADATA, type CareFocusTheme } from "@/lib/youcam/metadata";
import { EmptyState } from "./EmptyState";
import { ProductCard } from "./ProductCard";

export interface ProductDiscoverySectionProps {
  connectedProducts: SkincareProduct[];
  userShelfProducts: SkincareProduct[];
  referenceFixtures: SkincareProduct[];
  showReferenceFixtures: boolean;
  onToggleReferenceFixtures: (next: boolean) => void;
  selectedThemes: CareFocusTheme[];
  onToggleTheme: (theme: CareFocusTheme) => void;
  comparedIds: string[];
  onToggleCompare: (productId: string) => void;
  onInspectProduct: (product: SkincareProduct | null, initialIngredient?: string) => void;
  onOpenShelfModal: () => void;
}

export function ProductDiscoverySection({
  connectedProducts,
  userShelfProducts,
  referenceFixtures,
  showReferenceFixtures,
  onToggleReferenceFixtures,
  selectedThemes,
  onToggleTheme,
  comparedIds,
  onToggleCompare,
  onInspectProduct,
  onOpenShelfModal,
}: ProductDiscoverySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<FormulationCategory | "all">("all");
  const [selectedAttribute, setSelectedAttribute] = useState<FormulationAttribute | "all">("all");
  const [selectedIngredient, setSelectedIngredient] = useState<string | "all">("all");

  const activePool = useMemo(() => {
    return [
      ...connectedProducts,
      ...userShelfProducts,
      ...(showReferenceFixtures ? referenceFixtures : []),
    ];
  }, [connectedProducts, userShelfProducts, showReferenceFixtures, referenceFixtures]);

  // Build meaningful filter options strictly from real attributes present in activePool
  const availableCategories = useMemo(() => {
    return Array.from(new Set(activePool.map((p) => p.category)));
  }, [activePool]);

  const availableAttributes = useMemo(() => {
    return Array.from(new Set(activePool.flatMap((p) => p.attributes)));
  }, [activePool]);

  const availableIngredients = useMemo(() => {
    return Array.from(new Set(activePool.flatMap((p) => p.keyIngredients))).sort();
  }, [activePool]);

  const filteredProducts = useMemo(() => {
    return activePool.filter((product) => {
      if (selectedCategory !== "all" && product.category !== selectedCategory) {
        return false;
      }
      if (selectedAttribute !== "all" && !product.attributes.includes(selectedAttribute)) {
        return false;
      }
      if (selectedIngredient !== "all" && !product.keyIngredients.includes(selectedIngredient)) {
        return false;
      }
      if (
        selectedThemes.length > 0 &&
        !selectedThemes.some((theme) => product.focusThemes.includes(theme))
      ) {
        return false;
      }
      return true;
    });
  }, [activePool, selectedCategory, selectedAttribute, selectedIngredient, selectedThemes]);

  const hasAnyActiveFilter =
    selectedCategory !== "all" ||
    selectedAttribute !== "all" ||
    selectedIngredient !== "all" ||
    selectedThemes.length > 0;

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setSelectedAttribute("all");
    setSelectedIngredient("all");
    selectedThemes.forEach((t) => onToggleTheme(t));
  };

  return (
    <section
      id="discovery"
      aria-labelledby="discovery-heading"
      className="border-b border-stone-border bg-canvas py-16 sm:py-20 lg:py-24"
    >
      <div className="editorial-container">
        {/* Editorial Section Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-stone-border pb-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow-label text-sage-botanical">
              Formulation Discovery &amp; INCI Transparency
            </p>
            <h2
              id="discovery-heading"
              className="mt-2.5 font-serif text-display-md font-normal text-ink"
            >
              Explore skincare choices by documented ingredients.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-base">
              Examine formulations through stated cosmetic ingredient roles, fragrance disclosures,
              and routine purpose—without fabricated compatibility scores or promotional rankings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onInspectProduct(null)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-stone-strong bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
            >
              <BookOpen className="h-3.5 w-3.5 text-sage-botanical" aria-hidden="true" />
              <span>INCI Monograph Library</span>
            </button>

            <button
              type="button"
              onClick={onOpenShelfModal}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-4 py-2 text-xs font-medium text-surface transition-colors hover:bg-forest-hover"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Inspect product from your shelf</span>
            </button>
          </div>
        </div>

        {/* Reference Fixture Switch Bar (When live commercial feed is unconnected) */}
        {connectedProducts.length === 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-editorial border border-stone-border bg-surface px-4 py-3 text-xs text-ink-secondary sm:px-5">
            <div className="flex items-center gap-2.5">
              <FlaskConical className="h-4 w-4 shrink-0 text-clay" aria-hidden="true" />
              <span>
                {showReferenceFixtures ? (
                  <>
                    <strong className="font-medium text-ink">
                      Development Fixture Mode Active:
                    </strong>{" "}
                    Showing 4 unbranded, unpriced reference INCI archetypes alongside any products
                    you add from your shelf.
                  </>
                ) : (
                  <>
                    Live commercial retail inventory is not connected to{" "}
                    <code className="font-mono text-[11px] text-ink">/api/products</code>. No
                    third-party brands, prices, or reviews are fabricated.
                  </>
                )}
              </span>
            </div>

            <button
              type="button"
              aria-pressed={showReferenceFixtures}
              onClick={() => onToggleReferenceFixtures(!showReferenceFixtures)}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1.5 rounded-editorial border px-3 py-1.5 text-xs font-medium transition-colors",
                showReferenceFixtures
                  ? "border-clay/60 bg-clay-soft text-clay-deep"
                  : "border-stone-strong bg-canvas text-ink hover:bg-sage-soft/60"
              )}
            >
              <span>
                {showReferenceFixtures
                  ? "Hide reference archetypes"
                  : "Load 4 reference INCI archetypes (Dev fixture)"}
              </span>
            </button>
          </div>
        )}

        {/* Empty State vs Populated Curated Discovery Grid */}
        {activePool.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              eyebrow="Retail Catalogue Unconnected"
              title="No live retail product feed is connected yet"
              description="Dew & Form does not invent commercial skincare brands, prices, stock availability, star ratings, or store links when a merchant catalogue is absent. You can immediately inspect and compare real products from your own routine by pasting their packaging INCI list, browse our documented ingredient monograph library, or preview non-commercial reference formulation fixtures."
              note="Reusable ProductCard, IngredientDetails, and ProductComparison components are wired to /api/products and ready for genuine merchant inventory."
            >
              <button
                type="button"
                onClick={onOpenShelfModal}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium tracking-wide text-surface transition-colors hover:bg-forest-hover"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add &amp; inspect a product from your shelf</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleReferenceFixtures(true)}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-editorial border border-stone-strong bg-canvas px-5 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
              >
                <FlaskConical className="h-4 w-4 text-clay" aria-hidden="true" />
                <span>Preview non-commercial reference archetypes (Fixture)</span>
              </button>

              <button
                type="button"
                onClick={() => onInspectProduct(null)}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-editorial border border-stone-border bg-surface px-4 py-2.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>Browse 22 INCI monographs</span>
              </button>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* Real-Data Filter Bar */}
            <div className="space-y-4 rounded-editorial border border-stone-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-secondary">
                  Filter {activePool.length} {activePool.length === 1 ? "formulation" : "formulations"} by documented data
                </p>

                {hasAnyActiveFilter && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 text-xs font-medium text-forest underline underline-offset-4 hover:text-forest-hover"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset all filters</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Category Filter */}
                <div>
                  <label
                    htmlFor="filter-category"
                    className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                  >
                    Category
                  </label>
                  <select
                    id="filter-category"
                    value={selectedCategory}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value as FormulationCategory | "all")
                    }
                    className="mt-1.5 min-h-[40px] w-full rounded-editorial border border-stone-border bg-canvas px-3 text-xs text-ink"
                  >
                    <option value="all">All categories ({availableCategories.length})</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Key Ingredient Filter */}
                <div>
                  <label
                    htmlFor="filter-ingredient"
                    className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                  >
                    Documented Key Ingredient
                  </label>
                  <select
                    id="filter-ingredient"
                    value={selectedIngredient}
                    onChange={(e) => setSelectedIngredient(e.target.value)}
                    className="mt-1.5 min-h-[40px] w-full rounded-editorial border border-stone-border bg-canvas px-3 text-xs text-ink"
                  >
                    <option value="all">All documented ingredients</option>
                    {availableIngredients.map((ing) => (
                      <option key={ing} value={ing}>
                        {ing}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attribute Filter */}
                <div>
                  <label
                    htmlFor="filter-attribute"
                    className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                  >
                    Formulation Attribute
                  </label>
                  <select
                    id="filter-attribute"
                    value={selectedAttribute}
                    onChange={(e) =>
                      setSelectedAttribute(e.target.value as FormulationAttribute | "all")
                    }
                    className="mt-1.5 min-h-[40px] w-full rounded-editorial border border-stone-border bg-canvas px-3 text-xs text-ink"
                  >
                    <option value="all">Any attribute</option>
                    {availableAttributes.map((attr) => (
                      <option key={attr} value={attr}>
                        {attr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Focus Preference Chips */}
              <div className="border-t border-stone-border pt-3.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Care Focus Preferences:
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(CARE_THEME_METADATA) as CareFocusTheme[]).map((themeKey) => {
                    const active = selectedThemes.includes(themeKey);
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onToggleTheme(themeKey)}
                        className={cn(
                          "min-h-[32px] rounded-editorial border px-2.5 py-1 text-xs transition-colors",
                          active
                            ? "border-forest bg-forest font-medium text-surface"
                            : "border-stone-border bg-canvas text-ink-secondary hover:text-ink"
                        )}
                      >
                        {CARE_THEME_METADATA[themeKey].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filtered Grid */}
            {filteredProducts.length === 0 ? (
              <EmptyState
                eyebrow="No Matching Formulations"
                title="No loaded formulations match the current filter combination"
                description="Try clearing one of the active ingredient, category, or preference filters—or inspect another product from your shelf."
              >
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex min-h-[42px] items-center rounded-editorial bg-forest px-4 py-2 text-xs font-medium text-surface hover:bg-forest-hover"
                >
                  Clear active filters
                </button>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isCompared={comparedIds.includes(product.id)}
                    compareDisabled={comparedIds.length >= 3}
                    onToggleCompare={onToggleCompare}
                    onInspectProduct={onInspectProduct}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

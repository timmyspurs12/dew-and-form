"use client";

import React, { useMemo, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Layers,
  Loader2,
  Moon,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FormulationAttribute,
  FormulationCategory,
  SkincareProduct,
} from "@/lib/ingredients/types";
import {
  CARE_THEME_METADATA,
  composeRoutineBlueprint,
  type CareFocusTheme,
} from "@/lib/youcam/metadata";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./EmptyState";

export interface ProductDiscoverySectionProps {
  connectedProducts: SkincareProduct[];
  registryConnected: boolean | null;
  registryLoading: boolean;
  activeRegistryQuery: string | null;
  onSearchRegistry: (query: string) => void;
  userShelfProducts: SkincareProduct[];
  referenceFixtures: SkincareProduct[];
  showReferenceFixtures: boolean;
  onToggleReferenceFixtures: (next: boolean) => void;
  selectedThemes: CareFocusTheme[];
  onToggleTheme: (theme: CareFocusTheme) => void;
  selectedCategory?: "All" | FormulationCategory;
  onCategoryChange?: (category: "All" | FormulationCategory) => void;
  comparedIds: string[];
  onToggleCompare: (productId: string) => void;
  onInspectProduct: (product: SkincareProduct | null, initialIngredient?: string) => void;
  onOpenShelfModal: () => void;
}

const CATEGORIES: Array<"All" | FormulationCategory> = [
  "All",
  "Cleanser",
  "Toner & Essence",
  "Hydrating Serum",
  "Targeted Treatment",
  "Moisturiser & Barrier Cream",
  "Sunscreen",
];

const ATTRIBUTE_FILTERS: FormulationAttribute[] = [
  "Fragrance-free",
  "Essential-oil-free",
  "Denatured-alcohol-free",
  "Leave-on",
  "Rinse-off",
];

const SUGGESTED_REGISTRY_QUERIES = [
  "Niacinamide",
  "Ceramide",
  "Hyaluronic",
  "Salicylic acid",
  "Panthenol",
];

export function ProductDiscoverySection({
  connectedProducts,
  registryConnected,
  registryLoading,
  activeRegistryQuery,
  onSearchRegistry,
  userShelfProducts,
  referenceFixtures,
  showReferenceFixtures,
  onToggleReferenceFixtures,
  selectedThemes,
  onToggleTheme,
  selectedCategory: controlledCategory,
  onCategoryChange,
  comparedIds,
  onToggleCompare,
  onInspectProduct,
  onOpenShelfModal,
}: ProductDiscoverySectionProps) {
  const [searchInput, setSearchInput] = useState(activeRegistryQuery ?? "");
  const [internalCategory, setInternalCategory] = useState<"All" | FormulationCategory>("All");
  const [selectedIngredient, setSelectedIngredient] = useState<string>("All");
  const [requiredAttributes, setRequiredAttributes] = useState<FormulationAttribute[]>([]);
  // Active routine themes automatically filter & rank matching formulations by default
  const [filterByFocusPreferences, setFilterByFocusPreferences] = useState(true);
  const [routineDrawerOpen, setRoutineDrawerOpen] = useState(false);

  const selectedCategory = controlledCategory ?? internalCategory;
  const setSelectedCategory = (next: "All" | FormulationCategory) => {
    if (onCategoryChange) {
      onCategoryChange(next);
    } else {
      setInternalCategory(next);
    }
  };

  const visiblePool = useMemo(() => {
    return [
      ...userShelfProducts,
      ...connectedProducts,
      ...(showReferenceFixtures ? referenceFixtures : []),
    ];
  }, [connectedProducts, userShelfProducts, referenceFixtures, showReferenceFixtures]);

  const availableIngredients = useMemo(() => {
    const set = new Set<string>();
    for (const prod of visiblePool) {
      for (const ing of prod.keyIngredients) {
        set.add(ing);
      }
    }
    return ["All", ...Array.from(set).sort()];
  }, [visiblePool]);

  const matchingThemesCount = useMemo(() => {
    if (selectedThemes.length === 0) return visiblePool.length;
    return visiblePool.filter((prod) =>
      prod.focusThemes.some((theme) => selectedThemes.includes(theme))
    ).length;
  }, [visiblePool, selectedThemes]);

  const filteredProducts = useMemo(() => {
    const matches = visiblePool.filter((prod) => {
      if (selectedCategory !== "All" && prod.category !== selectedCategory) {
        return false;
      }
      if (selectedIngredient !== "All" && !prod.keyIngredients.includes(selectedIngredient)) {
        return false;
      }
      if (
        requiredAttributes.length > 0 &&
        !requiredAttributes.every((attr) => prod.attributes.includes(attr))
      ) {
        return false;
      }
      if (
        filterByFocusPreferences &&
        selectedThemes.length > 0 &&
        !prod.focusThemes.some((theme) => selectedThemes.includes(theme))
      ) {
        return false;
      }
      return true;
    });

    if (selectedThemes.length === 0) {
      return matches;
    }

    // Rank formulations overlapping more of the user's active routine priorities first
    return [...matches].sort((a, b) => {
      const aOverlap = a.focusThemes.filter((t) => selectedThemes.includes(t)).length;
      const bOverlap = b.focusThemes.filter((t) => selectedThemes.includes(t)).length;
      return bOverlap - aOverlap;
    });
  }, [
    visiblePool,
    selectedCategory,
    selectedIngredient,
    requiredAttributes,
    filterByFocusPreferences,
    selectedThemes,
  ]);

  const routineBlueprint = useMemo(
    () => (selectedThemes.length > 0 ? composeRoutineBlueprint(selectedThemes) : null),
    [selectedThemes]
  );

  const toggleAttribute = (attr: FormulationAttribute) => {
    setRequiredAttributes((prev) =>
      prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]
    );
  };

  const resetLocalFilters = () => {
    setSelectedCategory("All");
    setSelectedIngredient("All");
    setRequiredAttributes([]);
    setFilterByFocusPreferences(false);
  };

  const handleRegistrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchRegistry(searchInput.trim());
  };

  const handleClearRegistrySearch = () => {
    setSearchInput("");
    onSearchRegistry("");
  };

  const hasActiveLocalFilters =
    selectedCategory !== "All" ||
    selectedIngredient !== "All" ||
    requiredAttributes.length > 0 ||
    (filterByFocusPreferences && selectedThemes.length > 0);

  return (
    <section
      id="discovery"
      aria-labelledby="discovery-heading"
      className="border-b border-stone-border bg-canvas py-16 sm:py-20 lg:py-24"
    >
      <div className="editorial-container">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-stone-border pb-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow-label text-sage-botanical">
              Formulation Discovery &amp; INCI Transparency
            </p>
            <h2
              id="discovery-heading"
              tabIndex={-1}
              className="mt-2.5 font-serif text-display-md font-normal text-ink focus:outline-none"
            >
              Assess formulations by what they actually declare.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-base">
              Explore public cosmetic INCI declarations, inspect products from your own shelf, or
              review documented ingredient monographs without synthetic compatibility scores or
              promotional claims.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onInspectProduct(null)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-stone-strong bg-surface px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/50"
            >
              <BookOpen className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
              <span>Browse 22 INCI monographs</span>
            </button>

            <button
              type="button"
              onClick={onOpenShelfModal}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-4 py-2.5 text-xs font-medium text-surface transition-colors hover:bg-forest-hover"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Inspect a shelf product</span>
            </button>
          </div>
        </div>

        {/* Open Beauty Facts Registry Search & Provenance Bar */}
        <div className="mt-6 rounded-editorial border border-stone-border bg-surface p-5 sm:p-6">
          <form onSubmit={handleRegistrySubmit} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search Open Beauty Facts by product, brand, ingredient, or EAN/UPC barcode…"
                  aria-label="Search Open Beauty Facts INCI registry"
                  className="min-h-[44px] w-full rounded-editorial border border-stone-strong bg-canvas pl-10 pr-9 text-sm text-ink placeholder:text-ink-muted"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearRegistrySearch}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-editorial p-1 text-ink-muted hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={registryLoading}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium text-surface transition-colors hover:bg-forest-hover disabled:opacity-60"
                >
                  {registryLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Searching…</span>
                    </>
                  ) : (
                    <span>Search registry</span>
                  )}
                </button>

                {activeRegistryQuery && (
                  <button
                    type="button"
                    onClick={handleClearRegistrySearch}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-canvas px-3.5 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Default feed</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Ingredient & Category Search Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Explore INCI registry:
                </span>
                {SUGGESTED_REGISTRY_QUERIES.map((term) => {
                  const isCurrent =
                    activeRegistryQuery?.toLowerCase() === term.toLowerCase();
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchInput(term);
                        onSearchRegistry(term);
                      }}
                      className={cn(
                        "rounded-editorial border px-2.5 py-1 text-[11px] transition-colors",
                        isCurrent
                          ? "border-forest bg-sage-soft font-medium text-forest"
                          : "border-stone-border bg-canvas text-ink-secondary hover:border-stone-strong hover:text-ink"
                      )}
                    >
                      {term}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-pressed={showReferenceFixtures}
                onClick={() => onToggleReferenceFixtures(!showReferenceFixtures)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-editorial border px-3 py-1.5 text-xs font-medium transition-colors",
                  showReferenceFixtures
                    ? "border-clay bg-clay-soft/80 text-clay-deep"
                    : "border-stone-border bg-canvas text-ink-secondary hover:border-stone-strong hover:text-ink"
                )}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {showReferenceFixtures
                    ? "Hide 4 reference archetypes"
                    : "Include 4 reference archetypes"}
                </span>
              </button>
            </div>
          </form>

          {/* Clean Provenance Footnote */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-border pt-3.5 text-[11px] text-ink-secondary">
            {registryConnected === false ? (
              <p>
                Open Beauty Facts is temporarily unreachable from this connection &middot; Showing
                non-commercial formulation archetypes and any shelf entries you inspect locally.
              </p>
            ) : (
              <p>
                <strong className="font-medium text-ink">Open INCI Registry:</strong> Public
                packaging ingredient declarations sourced from{" "}
                <a
                  href="https://world.openbeautyfacts.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-forest underline decoration-forest/35 underline-offset-2 hover:text-forest-hover"
                >
                  <span>Open Beauty Facts</span>
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>{" "}
                under the Open Database License (ODbL). Non-commercial dataset—retail prices are not
                listed.
              </p>
            )}

            {activeRegistryQuery && !registryLoading && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                Query: &ldquo;{activeRegistryQuery}&rdquo; ({connectedProducts.length} matched)
              </span>
            )}
          </div>
        </div>

        {/* User-Controlled Routine Priorities & Auto-Filter Bar */}
        <div className="mt-5 rounded-editorial border border-stone-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                Active Routine Priorities (User-Controlled)
              </span>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {selectedThemes.length > 0
                  ? filterByFocusPreferences
                    ? `Automatically filtering to formulations aligned with your ${selectedThemes.length} selected ${selectedThemes.length === 1 ? "priority" : "priorities"} (${matchingThemesCount} matched).`
                    : `Highlighting ${matchingThemesCount} matching formulations while displaying all ${visiblePool.length} records.`
                  : "Select any routine priorities below to view an AM/PM step guide and automatically filter matching INCI formulations."}
              </p>
            </div>

            {selectedThemes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={filterByFocusPreferences}
                  onClick={() => setFilterByFocusPreferences((prev) => !prev)}
                  className={cn(
                    "rounded-editorial border px-3 py-1.5 text-xs font-medium transition-colors",
                    filterByFocusPreferences
                      ? "border-sage-muted bg-sage-soft text-forest"
                      : "border-stone-strong bg-canvas text-ink hover:bg-sage-soft/50"
                  )}
                >
                  {filterByFocusPreferences
                    ? `Filtered to priorities (${matchingThemesCount}) · Show all`
                    : `Showing all (${visiblePool.length}) · Filter to priorities`}
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(CARE_THEME_METADATA) as CareFocusTheme[]).map((themeKey) => {
              const active = selectedThemes.includes(themeKey);
              return (
                <button
                  key={themeKey}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) {
                      setFilterByFocusPreferences(true);
                    }
                    onToggleTheme(themeKey);
                  }}
                  className={cn(
                    "rounded-editorial border px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "border-forest bg-forest font-medium text-surface"
                      : "border-stone-border bg-canvas text-ink-secondary hover:border-stone-strong hover:text-ink"
                  )}
                >
                  {CARE_THEME_METADATA[themeKey].label}
                </button>
              );
            })}
          </div>

          {/* Compact Collapsible AM/PM Routine Step Reference directly inside Discovery */}
          {routineBlueprint && (
            <Collapsible.Root
              open={routineDrawerOpen}
              onOpenChange={setRoutineDrawerOpen}
              className="mt-4 border-t border-stone-border pt-3.5"
            >
              <Collapsible.Trigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-forest hover:text-forest-hover"
                >
                  <span>
                    AM / PM Routine Step &amp; Layering Guide for{" "}
                    {selectedThemes.map((t) => CARE_THEME_METADATA[t].shortLabel).join(" + ")}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      routineDrawerOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>
              </Collapsible.Trigger>

              <Collapsible.Content className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-editorial border border-stone-border bg-canvas p-3.5 text-xs">
                    <p className="inline-flex items-center gap-1.5 font-medium text-ink">
                      <Sun className="h-3.5 w-3.5 text-clay" aria-hidden="true" />
                      <span>Morning (AM)</span>
                    </p>
                    <ol className="mt-2 space-y-1.5 text-ink-secondary">
                      {routineBlueprint.morningSteps.map((s) => (
                        <li key={`disc-am-${s.stepNumber}`}>
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(s.targetCategory)}
                            className="font-mono text-[10px] font-medium text-forest underline decoration-forest/30 underline-offset-2"
                          >
                            {s.stepNumber} {s.stepTitle}
                          </button>{" "}
                          &mdash; {s.guidance}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-editorial border border-stone-border bg-canvas p-3.5 text-xs">
                    <p className="inline-flex items-center gap-1.5 font-medium text-ink">
                      <Moon className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                      <span>Evening (PM)</span>
                    </p>
                    <ol className="mt-2 space-y-1.5 text-ink-secondary">
                      {routineBlueprint.eveningSteps.map((s) => (
                        <li key={`disc-pm-${s.stepNumber}`}>
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(s.targetCategory)}
                            className="font-mono text-[10px] font-medium text-forest underline decoration-forest/30 underline-offset-2"
                          >
                            {s.stepNumber} {s.stepTitle}
                          </button>{" "}
                          ({s.cadenceBadge}) &mdash; {s.guidance}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Layering note: {routineBlueprint.layeringCautions[0]}
                </p>
              </Collapsible.Content>
            </Collapsible.Root>
          )}
        </div>

        {/* Filter Controls Bar */}
        {visiblePool.length > 0 && (
          <div className="mt-5 space-y-4 rounded-editorial border border-stone-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-ink">
                <SlidersHorizontal className="h-3.5 w-3.5 text-sage-botanical" aria-hidden="true" />
                <span>Filter Displayed Formulations ({filteredProducts.length} shown)</span>
              </div>

              {hasActiveLocalFilters && (
                <button
                  type="button"
                  onClick={resetLocalFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-forest underline underline-offset-4 hover:text-forest-hover"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Category Pills */}
              <div className="md:col-span-8">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Category
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "rounded-editorial border px-2.5 py-1 text-xs transition-colors",
                          active
                            ? "border-forest bg-sage-soft font-medium text-forest"
                            : "border-stone-border bg-canvas text-ink-secondary hover:text-ink"
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Key Ingredient Select */}
              <div className="md:col-span-4">
                <label
                  htmlFor="ingredient-filter-select"
                  className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                >
                  Documented Key Ingredient
                </label>
                <select
                  id="ingredient-filter-select"
                  value={selectedIngredient}
                  onChange={(e) => setSelectedIngredient(e.target.value)}
                  className="mt-1.5 min-h-[38px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-xs text-ink"
                >
                  {availableIngredients.map((ing) => (
                    <option key={ing} value={ing}>
                      {ing === "All" ? "All indexed ingredients" : ing}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Formulation Attribute Toggles */}
            <div className="border-t border-stone-border pt-3.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Required Label Attributes
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ATTRIBUTE_FILTERS.map((attr) => {
                  const active = requiredAttributes.includes(attr);
                  return (
                    <button
                      key={attr}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleAttribute(attr)}
                      className={cn(
                        "rounded-editorial border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-forest bg-forest font-medium text-surface"
                          : "border-stone-border bg-canvas text-ink-secondary hover:text-ink"
                      )}
                    >
                      {attr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Product Grid or Honest Empty / Loading State */}
        <div className="mt-8">
          {registryLoading && visiblePool.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center justify-center rounded-editorial border border-stone-border bg-surface px-6 py-14 text-center"
            >
              <Loader2 className="h-5 w-5 animate-spin text-forest" aria-hidden="true" />
              <p className="mt-3 font-serif text-xl text-ink">
                Loading verified INCI formulations…
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                Retrieving public cosmetic ingredient declarations from Open Beauty Facts.
              </p>
            </div>
          ) : visiblePool.length === 0 ? (
            <EmptyState
              eyebrow="No Matching Registry Records"
              title={
                activeRegistryQuery
                  ? `No verified skincare INCI records matched "${activeRegistryQuery}"`
                  : "No formulations currently displayed"
              }
              description={
                activeRegistryQuery
                  ? "Only records with a verified product name, brand, and multi-ingredient INCI declaration are shown. Try a broader ingredient or brand search, paste an INCI list from your own shelf, or include the 4 reference archetypes."
                  : "Search the Open Beauty Facts INCI registry above, inspect a product from your own shelf, or include the 4 non-commercial reference archetypes."
              }
            >
              {activeRegistryQuery && (
                <button
                  type="button"
                  onClick={handleClearRegistrySearch}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-4 py-2.5 text-xs font-medium text-surface transition-colors hover:bg-forest-hover"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Return to default skincare feed</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenShelfModal}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-stone-strong bg-canvas px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Inspect a product from your shelf</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleReferenceFixtures(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-stone-strong bg-canvas px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/50"
              >
                <Layers className="h-3.5 w-3.5 text-clay" aria-hidden="true" />
                <span>Include 4 reference archetypes</span>
              </button>
            </EmptyState>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              eyebrow="Zero Filter Matches"
              title="No displayed formulations match all active filters"
              description="Try relaxing your category, attribute, or active routine priority filter to view all loaded formulations."
            >
              {filterByFocusPreferences && selectedThemes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterByFocusPreferences(false)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-4 py-2.5 text-xs font-medium text-surface"
                >
                  <span>Show all {visiblePool.length} loaded formulations</span>
                </button>
              )}
              <button
                type="button"
                onClick={resetLocalFilters}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-stone-strong bg-canvas px-4 py-2.5 text-xs font-medium text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset active filters</span>
              </button>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selectedThemes={selectedThemes}
                  isCompared={comparedIds.includes(product.id)}
                  compareDisabled={comparedIds.length >= 3}
                  onToggleCompare={onToggleCompare}
                  onInspectIngredients={(prod, ing) => onInspectProduct(prod, ing)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

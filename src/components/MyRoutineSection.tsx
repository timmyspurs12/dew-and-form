"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cleanRawInciText,
  isFeaturedKeyMonograph,
  parseInciDeclaration,
} from "@/lib/ingredients/catalog";
import type {
  FormulationAttribute,
  FormulationCategory,
  SkincareProduct,
} from "@/lib/ingredients/types";
import {
  evaluateRoutineCompatibility,
  explainProductRoutineRole,
  sortRoutineProductsByLayerOrder,
  type RoutineTimeSlot,
} from "@/lib/routine/compatibility";

export interface MyRoutineSectionProps {
  morningProducts: SkincareProduct[];
  eveningProducts: SkincareProduct[];
  catalogueProducts: SkincareProduct[];
  updatedAt: string | null;
  onAddProduct: (product: SkincareProduct, slot: RoutineTimeSlot | "both") => void;
  onRemoveProduct: (productId: string, slot: RoutineTimeSlot) => void;
  onClearRoutine: () => void;
  onInspectIngredients: (product: SkincareProduct) => void;
  onCheckRoutineProduct: (product: SkincareProduct) => void;
}

const STEP_CATEGORIES: FormulationCategory[] = [
  "Cleanser",
  "Toner & Essence",
  "Hydrating Serum",
  "Targeted Treatment",
  "Moisturiser & Barrier Cream",
  "Sunscreen",
];

function buildOwnedRoutineItem(params: {
  name: string;
  brand: string;
  category: FormulationCategory;
  inciDeclaration: string;
}): SkincareProduct {
  const cleaned = cleanRawInciText(params.inciDeclaration);
  const parsed = parseInciDeclaration(cleaned);
  const matched = parsed
    .map((p) => p.monograph)
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const keyIngredients = Array.from(
    new Set(
      matched
        .filter(isFeaturedKeyMonograph)
        .map((m) => m.commonName.split(" (")[0])
    )
  ).slice(0, 4);

  const attributes: FormulationAttribute[] = [
    params.category === "Cleanser" ? "Rinse-off" : "Leave-on",
  ];
  if (cleaned) {
    if (!/\b(parfum|fragrance|aroma|linalool|limonene)\b/i.test(cleaned)) {
      attributes.push("Fragrance-free");
    } else {
      attributes.push("Contains fragrance");
    }
    if (/\b(salicylic\s+acid|glycolic\s+acid|lactic\s+acid|mandelic\s+acid)\b/i.test(cleaned)) {
      attributes.push("Contains exfoliating acid");
    }
    if (/\b(retinol|retinal|retinaldehyde|hydroxypinacolone\s+retinoate)\b/i.test(cleaned)) {
      attributes.push("Contains retinoid");
    }
  }

  return {
    id: `owned-routine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name.trim(),
    brand: params.brand.trim() || "Already Owned",
    category: params.category,
    sourceKind: "user-shelf",
    provenance: cleaned.length >= 15 ? "confirmed-packaging-label" : "manual-incomplete",
    sourceUrl: null,
    barcode: null,
    imageUrl: null,
    surfacedReason: cleaned
      ? `Personal ${params.category.toLowerCase()} step saved in your browser with packaging INCI.`
      : `Personal ${params.category.toLowerCase()} staple—add INCI anytime for active conflict checks.`,
    keyIngredients,
    inciDeclaration: cleaned || null,
    focusThemes: Array.from(
      new Set(matched.flatMap((m) => m.relatedThemes))
    ).slice(0, 3),
    attributes,
    price: null,
    sizeLabel: null,
  };
}

export function MyRoutineSection({
  morningProducts,
  eveningProducts,
  catalogueProducts,
  updatedAt,
  onAddProduct,
  onRemoveProduct,
  onClearRoutine,
  onInspectIngredients,
  onCheckRoutineProduct,
}: MyRoutineSectionProps) {
  const [ownedDrawerOpen, setOwnedDrawerOpen] = useState(false);
  const [ownedName, setOwnedName] = useState("");
  const [ownedBrand, setOwnedBrand] = useState("");
  const [ownedCategory, setOwnedCategory] = useState<FormulationCategory>("Cleanser");
  const [ownedInci, setOwnedInci] = useState("");
  const [ownedSlot, setOwnedSlot] = useState<RoutineTimeSlot | "both">("both");
  const [ownedError, setOwnedError] = useState<string | null>(null);

  const [quickPickId, setQuickPickId] = useState<string>("");
  const [quickPickSlot, setQuickPickSlot] = useState<RoutineTimeSlot | "both">("morning");

  const sortedMorning = useMemo(
    () => sortRoutineProductsByLayerOrder(morningProducts),
    [morningProducts]
  );
  const sortedEvening = useMemo(
    () => sortRoutineProductsByLayerOrder(eveningProducts),
    [eveningProducts]
  );

  const compatibilityWarnings = useMemo(
    () =>
      evaluateRoutineCompatibility({
        morningProducts: sortedMorning,
        eveningProducts: sortedEvening,
      }),
    [sortedMorning, sortedEvening]
  );

  const handleSaveOwnedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownedName.trim()) {
      setOwnedError("Enter the name of the product you already use.");
      return;
    }

    const built = buildOwnedRoutineItem({
      name: ownedName,
      brand: ownedBrand,
      category: ownedCategory,
      inciDeclaration: ownedInci,
    });
    onAddProduct(built, ownedSlot);
    setOwnedName("");
    setOwnedBrand("");
    setOwnedInci("");
    setOwnedError(null);
    setOwnedDrawerOpen(false);
  };

  const handleQuickAddCatalogue = () => {
    const found = catalogueProducts.find((p) => p.id === quickPickId);
    if (!found) return;
    onAddProduct(found, quickPickSlot);
  };

  const totalSavedCount = morningProducts.length + eveningProducts.length;

  const renderSlotList = (slot: RoutineTimeSlot, items: SkincareProduct[]) => {
    const isMorning = slot === "morning";

    return (
      <div className="flex flex-col justify-between rounded-editorial border border-stone-border bg-surface p-6 sm:p-7">
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-stone-border pb-4">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-editorial",
                  isMorning
                    ? "bg-sage-soft text-forest"
                    : "bg-forest text-surface"
                )}
              >
                {isMorning ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div>
                <h3 className="font-serif text-xl text-ink">
                  {isMorning ? "Morning Steps (AM)" : "Evening Steps (PM)"}
                </h3>
                <p className="text-xs text-ink-secondary">
                  {isMorning
                    ? "Hydration, comfort & daily UV protection"
                    : "Thorough cleanse, paced renewal & barrier seal"}
                </p>
              </div>
            </div>

            <span className="rounded-editorial border border-stone-border bg-canvas px-2.5 py-1 font-mono text-[11px] text-ink-secondary">
              {items.length} {items.length === 1 ? "step" : "steps"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="mt-6 rounded-editorial border border-dashed border-stone-strong bg-canvas p-5 text-xs leading-relaxed text-ink-secondary">
              <p className="font-medium text-ink">
                No {isMorning ? "morning" : "evening"} products saved yet.
              </p>
              <p className="mt-1">
                Start with products you already own and tolerate well—a gentle cleanser, a barrier
                moisturiser{isMorning ? ", and a daytime SPF 30+" : ""} are often enough without
                buying extra bottles.
              </p>
            </div>
          ) : (
            <ol className="mt-5 space-y-3">
              {items.map((product, index) => {
                const { stepBadge, roleExplanation } = explainProductRoutineRole(product, slot);
                return (
                  <li
                    key={`${slot}-${product.id}`}
                    className="rounded-editorial border border-stone-border bg-canvas p-4 transition-colors hover:border-stone-strong"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-forest">
                            0{index + 1} &middot; {stepBadge}
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted">
                            {product.brand}
                          </span>
                        </div>
                        <p className="mt-1 font-serif text-base text-ink">{product.name}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveProduct(product.id, slot)}
                        aria-label={`Remove ${product.name} from ${slot} routine`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-editorial border border-stone-border bg-surface text-ink-muted transition-colors hover:border-clay hover:bg-clay-soft hover:text-clay-deep"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                      {roleExplanation}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-border/75 pt-2.5 text-[11px]">
                      {product.inciDeclaration ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onInspectIngredients(product)}
                            className="inline-flex items-center gap-1 font-medium text-forest underline decoration-forest/35 underline-offset-4 hover:text-forest-hover"
                          >
                            <BookOpen className="h-3 w-3" aria-hidden="true" />
                            <span>INCI details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onCheckRoutineProduct(product)}
                            className="inline-flex items-center gap-1 font-medium text-ink-secondary underline decoration-stone-strong underline-offset-4 hover:text-ink"
                          >
                            <span>Re-run Product Check</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCheckRoutineProduct(product)}
                          className="inline-flex items-center gap-1 font-medium text-forest underline decoration-forest/35 underline-offset-4 hover:text-forest-hover"
                        >
                          <span>Add INCI in Product Check to verify actives</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    );
  };

  return (
    <section
      id="my-routine"
      aria-labelledby="my-routine-heading"
      className="border-b border-stone-border bg-canvas py-16 sm:py-20"
    >
      <div className="editorial-container">
        <div className="flex flex-col justify-between gap-6 border-b border-stone-border pb-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="eyebrow-label text-sage-botanical">
              Personal Shelf &middot; Saved Locally in Your Browser
            </p>
            <h2
              id="my-routine-heading"
              tabIndex={-1}
              className="mt-2.5 font-serif text-display-md font-normal text-ink focus:outline-none"
            >
              My Routine (AM &amp; PM)
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-base">
              Keep track of a calm, sustainable morning and evening routine using products you
              already own alongside verified catalogue entries. Dew &amp; Form sequences steps by
              texture, explains each product&rsquo;s cosmetic role, and flags active layering
              conflicts—without pushing extra purchases.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOwnedDrawerOpen((v) => !v)}
              aria-expanded={ownedDrawerOpen}
              className="btn-editorial-primary min-h-[42px] px-4 py-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{ownedDrawerOpen ? "Close Owned Product Form" : "Add Product I Own"}</span>
            </button>

            {totalSavedCount > 0 && (
              <button
                type="button"
                onClick={onClearRoutine}
                className="btn-editorial-secondary min-h-[42px] px-3.5 py-2 text-xs text-ink-secondary hover:text-clay-deep"
              >
                <span>Clear saved routine</span>
              </button>
            )}
          </div>
        </div>

        {/* Optional Quick-Add from Loaded Catalogue */}
        {catalogueProducts.length > 0 && (
          <div className="mt-6 flex flex-col gap-2.5 rounded-editorial border border-stone-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-ink">
              Quick-assign from verified INCI catalogue:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Choose a catalogue product for My Routine"
                value={quickPickId}
                onChange={(e) => setQuickPickId(e.target.value)}
                className="min-h-[38px] max-w-xs rounded-editorial border border-stone-strong bg-canvas px-3 text-xs text-ink"
              >
                <option value="">Select catalogue product…</option>
                {catalogueProducts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.brand} · {item.category})
                  </option>
                ))}
              </select>

              <select
                aria-label="Choose Morning, Evening, or Both slots"
                value={quickPickSlot}
                onChange={(e) =>
                  setQuickPickSlot(e.target.value as RoutineTimeSlot | "both")
                }
                className="min-h-[38px] rounded-editorial border border-stone-strong bg-canvas px-2.5 text-xs text-ink"
              >
                <option value="morning">Morning (AM)</option>
                <option value="evening">Evening (PM)</option>
                <option value="both">Both AM &amp; PM</option>
              </select>

              <button
                type="button"
                disabled={!quickPickId}
                onClick={handleQuickAddCatalogue}
                className="btn-editorial-secondary min-h-[38px] px-3.5 text-xs"
              >
                <span>Add step</span>
              </button>
            </div>
          </div>
        )}

        {/* Inline Add Owned Product Form */}
        {ownedDrawerOpen && (
          <form
            onSubmit={handleSaveOwnedItem}
            className="mt-6 rounded-editorial border border-stone-strong bg-surface p-5 sm:p-6"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-serif text-lg text-ink">
                Add a product you already have at home
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-wider text-sage-botanical">
                No purchase needed
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label htmlFor="owned-name" className="block text-xs font-medium text-ink">
                  Staple Title *
                </label>
                <input
                  id="owned-name"
                  type="text"
                  value={ownedName}
                  onChange={(e) => setOwnedName(e.target.value)}
                  placeholder="e.g. Gentle Foaming Cleanser"
                  className="mt-1 min-h-[40px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="owned-brand" className="block text-xs font-medium text-ink">
                  Brand (optional)
                </label>
                <input
                  id="owned-brand"
                  type="text"
                  value={ownedBrand}
                  onChange={(e) => setOwnedBrand(e.target.value)}
                  placeholder="e.g. CeraVe"
                  className="mt-1 min-h-[40px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="owned-slot" className="block text-xs font-medium text-ink">
                  When do you use it?
                </label>
                <select
                  id="owned-slot"
                  value={ownedSlot}
                  onChange={(e) => setOwnedSlot(e.target.value as RoutineTimeSlot | "both")}
                  className="mt-1 min-h-[40px] w-full rounded-editorial border border-stone-strong bg-canvas px-2.5 text-sm text-ink"
                >
                  <option value="morning">Morning (AM)</option>
                  <option value="evening">Evening (PM)</option>
                  <option value="both">Both AM &amp; PM</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="owned-category" className="block text-xs font-medium text-ink">
                  Step Type
                </label>
                <select
                  id="owned-category"
                  value={ownedCategory}
                  onChange={(e) => setOwnedCategory(e.target.value as FormulationCategory)}
                  className="mt-1 min-h-[40px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink"
                >
                  {STEP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="owned-inci" className="block text-xs font-medium text-ink">
                  INCI Ingredient List (optional — enables active overlap checks)
                </label>
                <input
                  id="owned-inci"
                  type="text"
                  value={ownedInci}
                  onChange={(e) => setOwnedInci(e.target.value)}
                  placeholder="Aqua, Glycerin, Ceramide NP, Retinol…"
                  className="mt-1 min-h-[40px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-xs text-ink"
                />
              </div>
            </div>

            {ownedError && (
              <p role="alert" className="mt-2.5 text-xs font-medium text-clay-deep">
                {ownedError}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOwnedDrawerOpen(false)}
                className="btn-editorial-secondary min-h-[38px] px-4 text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="btn-editorial-primary min-h-[38px] px-5 text-xs">
                Save to My Routine
              </button>
            </div>
          </form>
        )}

        {/* Compatibility Status Bar */}
        {totalSavedCount > 0 && (
          <div className="mt-8">
            {compatibilityWarnings.length === 0 ? (
              <div
                role="status"
                className="flex items-start gap-3 rounded-editorial border border-sage-muted bg-sage-soft/55 p-4 text-xs leading-relaxed text-ink"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-forest"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-forest">
                    No active layering conflicts detected across your saved steps.
                  </p>
                  <p className="mt-0.5 text-ink-secondary">
                    Always patch-test new products individually and keep your routine as streamlined
                    as your skin feels comfortable with.
                  </p>
                </div>
              </div>
            ) : (
              <div
                role="region"
                aria-label="Routine compatibility warnings"
                className="space-y-2.5"
              >
                {compatibilityWarnings.map((w) => (
                  <div
                    key={w.id}
                    className={cn(
                      "flex items-start gap-3 rounded-editorial border p-4 text-xs leading-relaxed",
                      w.severity === "caution"
                        ? "border-clay/55 bg-clay-soft/65 text-ink"
                        : "border-stone-strong bg-surface text-ink"
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        w.severity === "caution" ? "text-clay-deep" : "text-sage-botanical"
                      )}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-ink">{w.title}</p>
                      <p className="mt-0.5 text-ink-secondary">{w.explanation}</p>
                      {w.involvedProductNames.length > 0 && (
                        <p className="mt-1 font-mono text-[10px] text-clay-deep">
                          Involved steps: {w.involvedProductNames.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AM & PM Columns */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {renderSlotList("morning", sortedMorning)}
          {renderSlotList("evening", sortedEvening)}
        </div>

        {/* Mindful Minimalism Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <p className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-sage-botanical" aria-hidden="true" />
            <span>
              Minimalist principle: an empty slot does not mean you need to buy another product.
            </span>
          </p>
          {updatedAt && (
            <span className="font-mono text-[10px]">
              Saved locally in browser &middot; No account required
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

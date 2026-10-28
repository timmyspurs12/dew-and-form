"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { parseInciDeclaration } from "@/lib/ingredients/catalog";
import type {
  FormulationAttribute,
  FormulationCategory,
  SkincareProduct,
} from "@/lib/ingredients/types";
import type { CareFocusTheme } from "@/lib/youcam/metadata";

export interface FormulaShelfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: SkincareProduct) => void;
}

const CATEGORIES: FormulationCategory[] = [
  "Cleanser",
  "Toner & Essence",
  "Hydrating Serum",
  "Targeted Treatment",
  "Moisturiser & Barrier Cream",
  "Sunscreen",
];

const OPTIONAL_ATTRIBUTES: FormulationAttribute[] = [
  "Fragrance-free",
  "Essential-oil-free",
  "Denatured-alcohol-free",
  "Leave-on",
  "Rinse-off",
];

export function FormulaShelfModal({
  open,
  onOpenChange,
  onAddProduct,
}: FormulaShelfModalProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<FormulationCategory>("Hydrating Serum");
  const [priceAmount, setPriceAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [inciDeclaration, setInciDeclaration] = useState("");
  const [attributes, setAttributes] = useState<FormulationAttribute[]>(["Leave-on"]);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleAttr = (attr: FormulationAttribute) => {
    setAttributes((prev) =>
      prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Please enter the product name.");
      return;
    }
    if (!inciDeclaration.trim()) {
      setFormError(
        "Please paste the INCI ingredient list from the product label so Dew & Form can assess its documented ingredients."
      );
      return;
    }

    const parsed = parseInciDeclaration(inciDeclaration);
    const matchedMonographs = parsed
      .map((p) => p.monograph)
      .filter((m): m is NonNullable<typeof m> => m !== null);

    const uniqueKeyIngredients = Array.from(
      new Set(matchedMonographs.map((m) => m.commonName.split(" (")[0]))
    ).slice(0, 6);

    const derivedThemes = Array.from(
      new Set<CareFocusTheme>(matchedMonographs.flatMap((m) => m.relatedThemes))
    );

    const derivedAttrs = [...attributes];
    if (
      matchedMonographs.some((m) => m.id === "salicylic-acid" || m.id === "lactic-acid") &&
      !derivedAttrs.includes("Contains exfoliating acid")
    ) {
      derivedAttrs.push("Contains exfoliating acid");
    }
    if (
      matchedMonographs.some((m) => m.id === "retinol") &&
      !derivedAttrs.includes("Contains retinoid")
    ) {
      derivedAttrs.push("Contains retinoid");
    }

    const numericPrice = Number.parseFloat(priceAmount);
    const hasValidPrice = Number.isFinite(numericPrice) && numericPrice >= 0 && priceAmount.trim() !== "";

    const newProduct: SkincareProduct = {
      id: `shelf-${Date.now()}`,
      sourceKind: "user-shelf",
      name: name.trim(),
      brand: brand.trim() || "Personal Shelf Entry",
      category,
      price: hasValidPrice ? { amount: numericPrice, currency } : null,
      sizeLabel: null,
      imageUrl: null,
      inciDeclaration: inciDeclaration.trim(),
      keyIngredients: uniqueKeyIngredients,
      attributes: derivedAttrs,
      focusThemes: derivedThemes,
      surfacedReason:
        uniqueKeyIngredients.length > 0
          ? `Added from your shelf · Recognised ${uniqueKeyIngredients.length} documented INCI monographs (${uniqueKeyIngredients.slice(0, 3).join(", ")}).`
          : "Added from your personal shelf for side-by-side INCI inspection.",
    };

    onAddProduct(newProduct);
    setName("");
    setBrand("");
    setPriceAmount("");
    setInciDeclaration("");
    setFormError(null);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-editorial border border-stone-border bg-surface p-6 focus:outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-stone-border pb-4">
            <div>
              <p className="eyebrow-label text-sage-botanical">Shelf INCI Inspector</p>
              <Dialog.Title className="mt-1 font-serif text-2xl text-ink">
                Inspect a product from your shelf
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Enter a skincare product you own or are considering along with its label INCI list
                to inspect documented ingredient roles and compare it side by side.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-editorial border border-stone-border bg-canvas text-ink hover:bg-sage-soft/50"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="shelf-name" className="block text-xs font-medium text-ink">
                  Product Name <span className="text-clay-deep">*</span>
                </label>
                <input
                  id="shelf-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily Barrier Moisturising Lotion"
                  className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink placeholder:text-ink-muted"
                />
              </div>

              <div>
                <label htmlFor="shelf-brand" className="block text-xs font-medium text-ink">
                  Brand (optional)
                </label>
                <input
                  id="shelf-brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="From packaging label"
                  className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink placeholder:text-ink-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="shelf-category" className="block text-xs font-medium text-ink">
                  Category
                </label>
                <select
                  id="shelf-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FormulationCategory)}
                  className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="shelf-price" className="block text-xs font-medium text-ink">
                  Price (optional)
                </label>
                <input
                  id="shelf-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  placeholder="Leave blank if unknown"
                  className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink placeholder:text-ink-muted"
                />
              </div>

              <div>
                <label htmlFor="shelf-currency" className="block text-xs font-medium text-ink">
                  Currency
                </label>
                <select
                  id="shelf-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-sm text-ink"
                >
                  <option value="USD">USD ($)</option>
                  <option value="NGN">NGN (₦)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-ink">
                Known Label Attributes
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {OPTIONAL_ATTRIBUTES.map((attr) => {
                  const active = attributes.includes(attr);
                  return (
                    <button
                      key={attr}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleAttr(attr)}
                      className={`rounded-editorial border px-3 py-1.5 text-xs transition-colors ${
                        active
                          ? "border-forest bg-sage-soft font-medium text-forest"
                          : "border-stone-border bg-canvas text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {attr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="shelf-inci" className="block text-xs font-medium text-ink">
                INCI Ingredient Declaration <span className="text-clay-deep">*</span>
              </label>
              <textarea
                id="shelf-inci"
                rows={4}
                value={inciDeclaration}
                onChange={(e) => setInciDeclaration(e.target.value)}
                placeholder="Paste comma-separated ingredients from packaging, e.g.: Aqua, Glycerin, Niacinamide, Panthenol, Ceramide NP, Squalane, Phenoxyethanol"
                className="mt-1.5 w-full rounded-editorial border border-stone-strong bg-canvas p-3 text-xs leading-relaxed text-ink placeholder:text-ink-muted"
              />
            </div>

            {formError && (
              <p role="alert" className="text-xs font-medium text-clay-deep">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-border pt-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center rounded-editorial border border-stone-strong bg-canvas px-4 py-2 text-xs font-medium text-ink hover:bg-sage-soft/50"
                >
                  Cancel
                </button>
              </Dialog.Close>

              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2 text-xs font-medium text-surface hover:bg-forest-hover"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add to discovery &amp; INCI inspector</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

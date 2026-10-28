"use client";

import React from "react";
import { Check, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkincareProduct } from "@/lib/ingredients/types";

export interface ProductCardProps {
  product: SkincareProduct;
  isCompared: boolean;
  compareDisabled: boolean;
  onToggleCompare: (productId: string) => void;
  onInspectProduct: (product: SkincareProduct, initialIngredient?: string) => void;
}

export function formatProductPrice(price: SkincareProduct["price"]): string {
  if (!price) {
    return "Price unavailable";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency,
      maximumFractionDigits: 2,
    }).format(price.amount);
  } catch {
    return `${price.currency} ${price.amount.toFixed(2)}`;
  }
}

export function ProductCard({
  product,
  isCompared,
  compareDisabled,
  onToggleCompare,
  onInspectProduct,
}: ProductCardProps) {
  const isFixture = product.sourceKind === "development-fixture";
  const isUserShelf = product.sourceKind === "user-shelf";

  return (
    <article className="group flex flex-col justify-between rounded-editorial border border-stone-border bg-surface transition-colors duration-200 hover:border-stone-strong">
      <div>
        {/* Editorial Vessel Visual or Architectural Monogram */}
        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-stone-border bg-canvas-subtle">
          {product.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.imageUrl}
              alt={`Unbranded studio still life representing ${product.category.toLowerCase()}`}
              className="h-full w-full object-cover transition-transform duration-500 ease-editorial group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-canvas p-6 text-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {product.category}
              </span>
              <span className="mt-2 font-serif text-xl text-ink">{product.name}</span>
            </div>
          )}

          {/* Provenance & Category Labels */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-editorial border border-stone-border bg-surface/95 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink">
              {product.category}
            </span>
            {isFixture && (
              <span className="rounded-editorial border border-clay/50 bg-clay-soft/95 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-clay-deep">
                Dev Fixture
              </span>
            )}
            {isUserShelf && (
              <span className="rounded-editorial border border-sage-muted bg-sage-soft/95 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-forest">
                Your Shelf
              </span>
            )}
          </div>
        </div>

        {/* Editorial Body */}
        <div className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-mono text-[11px] uppercase tracking-wider text-ink-secondary">
              {product.brand}
            </p>
            <p
              className={cn(
                "shrink-0 font-mono text-xs",
                product.price ? "font-medium text-ink" : "text-ink-muted"
              )}
            >
              {product.price
                ? formatProductPrice(product.price)
                : isFixture
                  ? "Unpriced fixture"
                  : "Price not entered"}
            </p>
          </div>

          <h3 className="mt-1.5 font-serif text-xl text-ink">{product.name}</h3>

          {/* Concise Explanation of Why Surfaced */}
          <p className="mt-2.5 text-xs leading-relaxed text-ink-secondary">
            {product.surfacedReason}
          </p>

          {/* Key Documented Ingredients */}
          {product.keyIngredients.length > 0 && (
            <div className="mt-4 border-t border-stone-border pt-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Documented Key INCI (Select to inspect)
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.keyIngredients.map((ing) => (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => onInspectProduct(product, ing)}
                    className="rounded-editorial border border-stone-border bg-canvas px-2.5 py-1 text-xs text-ink transition-colors hover:border-forest hover:bg-sage-soft/60"
                  >
                    {ing}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Relevant Formulation Attributes */}
          {product.attributes.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {product.attributes.map((attr) => (
                <span
                  key={attr}
                  className="font-mono text-[10px] text-ink-secondary after:ml-1.5 after:content-['·'] last:after:content-none"
                >
                  {attr}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tactile Card Footer Actions */}
      <div className="grid grid-cols-2 border-t border-stone-border bg-canvas/60">
        <button
          type="button"
          onClick={() => onInspectProduct(product)}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 border-r border-stone-border px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
        >
          <FileText className="h-3.5 w-3.5 text-sage-botanical" aria-hidden="true" />
          <span>Inspect INCI</span>
        </button>

        <button
          type="button"
          aria-pressed={isCompared}
          disabled={!isCompared && compareDisabled}
          onClick={() => onToggleCompare(product.id)}
          className={cn(
            "inline-flex min-h-[46px] items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors",
            isCompared
              ? "bg-forest text-surface hover:bg-forest-hover"
              : "text-ink hover:bg-sage-soft/60 disabled:cursor-not-allowed disabled:opacity-45"
          )}
        >
          {isCompared ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>In comparison</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 text-sage-botanical" aria-hidden="true" />
              <span>Compare</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

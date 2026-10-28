"use client";

import React, { useState } from "react";
import { BookOpen, Check, ExternalLink, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkincareProduct } from "@/lib/ingredients/types";

export interface ProductCardProps {
  product: SkincareProduct;
  isCompared: boolean;
  compareDisabled: boolean;
  onToggleCompare: (productId: string) => void;
  onInspectIngredients: (product: SkincareProduct, initialIngredient?: string) => void;
}

export function formatProductPrice(price: SkincareProduct["price"]): string {
  if (!price || !Number.isFinite(price.amount)) {
    return "Non-commercial INCI record";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency || "USD",
    }).format(price.amount);
  } catch {
    return `${price.currency} ${price.amount.toFixed(2)}`;
  }
}

function getSourceBadge(sourceKind: SkincareProduct["sourceKind"]): {
  label: string;
  className: string;
} | null {
  if (sourceKind === "open-beauty-facts") {
    return {
      label: "Open INCI Record",
      className: "border-stone-strong bg-surface/95 text-ink-secondary",
    };
  }
  if (sourceKind === "reference-archetype") {
    return {
      label: "Reference Archetype",
      className: "border-clay bg-clay-soft/95 text-clay-deep",
    };
  }
  if (sourceKind === "user-shelf") {
    return {
      label: "Your Shelf",
      className: "border-sage-muted bg-sage-soft/95 text-forest",
    };
  }
  return null;
}

export function ProductCard({
  product,
  isCompared,
  compareDisabled,
  onToggleCompare,
  onInspectIngredients,
}: ProductCardProps) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const badge = getSourceBadge(product.sourceKind);
  const showImage = Boolean(product.imageUrl) && !imageLoadFailed;

  return (
    <article className="flex h-full flex-col justify-between rounded-editorial border border-stone-border bg-surface transition-colors hover:border-stone-strong">
      <div>
        {/* Product Media or Calm Typographic Vessel Placeholder */}
        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-stone-border bg-canvas">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl!}
              alt={product.name}
              onError={() => setImageLoadFailed(true)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col justify-between p-5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {product.category}
              </span>
              <p className="font-serif text-lg italic text-ink-secondary">{product.brand}</p>
            </div>
          )}

          {badge && (
            <div className="absolute left-3 top-3">
              <span
                className={cn(
                  "rounded-editorial border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-sage-botanical">
              {product.category}
            </span>
            <span className="font-mono text-xs text-ink-secondary">
              {product.price ? (
                <span className="font-medium text-ink">{formatProductPrice(product.price)}</span>
              ) : product.sourceKind === "user-shelf" ? (
                <span className="text-ink-muted">Price not entered</span>
              ) : (
                <span className="text-ink-muted">Non-commercial INCI record</span>
              )}
            </span>
          </div>

          <h3 className="mt-2 font-serif text-xl leading-snug text-ink">{product.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-secondary">
            <span>
              {product.brand}
              {product.sizeLabel ? ` · ${product.sizeLabel}` : ""}
            </span>
            {product.sourceUrl && (
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-muted underline decoration-stone-strong underline-offset-2 hover:text-forest"
              >
                <span>OBF{product.barcode ? ` #${product.barcode}` : ""}</span>
                <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
              </a>
            )}
          </div>

          {/* Why Surfaced */}
          <p className="mt-3 border-l-2 border-sage-muted pl-3 text-xs leading-relaxed text-ink-secondary">
            {product.surfacedReason}
          </p>

          {/* Key Documented Ingredients */}
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Key Documented Ingredients
            </p>
            {product.keyIngredients.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.keyIngredients.map((ing) => (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => onInspectIngredients(product, ing)}
                    className="rounded-editorial border border-stone-border bg-canvas px-2.5 py-1 text-xs text-ink transition-colors hover:border-forest hover:bg-sage-soft/50"
                  >
                    {ing}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-ink-muted">
                Inspect full INCI declaration below for complete base composition
              </p>
            )}
          </div>

          {/* Formulation Attributes */}
          {product.attributes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-stone-border pt-3.5">
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

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-stone-border bg-canvas/60 px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={() => onInspectIngredients(product)}
          className="inline-flex min-h-[38px] items-center gap-1.5 text-xs font-medium text-forest underline decoration-forest/35 underline-offset-4 transition-colors hover:text-forest-hover"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Full INCI &amp; roles</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleCompare(product.id)}
          disabled={!isCompared && compareDisabled}
          aria-pressed={isCompared}
          className={cn(
            "inline-flex min-h-[38px] items-center gap-1.5 rounded-editorial border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
            isCompared
              ? "border-forest bg-forest text-surface"
              : "border-stone-strong bg-surface text-ink hover:bg-sage-soft/60"
          )}
        >
          {isCompared ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Comparing</span>
            </>
          ) : (
            <>
              <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Compare</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

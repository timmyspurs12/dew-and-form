import type { CareFocusTheme } from "@/lib/youcam/metadata";

export interface IngredientMonograph {
  id: string;
  inciName: string;
  commonName: string;
  aliases: string[];
  statedRoles: string[];
  plainDescription: string;
  evidenceSummary: string;
  sourceAttribution: string;
  limitations: string;
  relatedThemes: CareFocusTheme[];
  cautionNote?: string;
}

export interface ParsedFormulaIngredient {
  position: number;
  rawLabel: string;
  monograph: IngredientMonograph | null;
}

export type FormulationCategory =
  | "Cleanser"
  | "Hydrating Serum"
  | "Targeted Treatment"
  | "Moisturiser & Barrier Cream"
  | "Sunscreen"
  | "Toner & Essence";

export type FormulationAttribute =
  | "Fragrance-free"
  | "Essential-oil-free"
  | "Denatured-alcohol-free"
  | "Leave-on"
  | "Rinse-off"
  | "Contains exfoliating acid"
  | "Contains retinoid";

export type ProductSourceKind =
  | "connected-catalogue"
  | "user-shelf"
  | "development-fixture";

export interface SkincareProduct {
  id: string;
  sourceKind: ProductSourceKind;
  name: string;
  brand: string;
  category: FormulationCategory;
  /** Honest price representation: null when price is unavailable or non-commercial fixture */
  price: {
    amount: number;
    currency: string;
  } | null;
  sizeLabel?: string | null;
  imageUrl?: string | null;
  /** Full raw INCI ingredient declaration when available */
  inciDeclaration: string | null;
  /** Highlighted key INCI ingredients resolved from the declaration */
  keyIngredients: string[];
  attributes: FormulationAttribute[];
  focusThemes: CareFocusTheme[];
  /** Calm, non-medical explanation of why this product or archetype is surfaced */
  surfacedReason: string;
  intendedStepNote?: string;
}

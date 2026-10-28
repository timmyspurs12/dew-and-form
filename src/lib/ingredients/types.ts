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
  | "Contains fragrance"
  | "Essential-oil-free"
  | "Denatured-alcohol-free"
  | "Leave-on"
  | "Rinse-off"
  | "Contains exfoliating acid"
  | "Contains retinoid";

export type ProductSourceKind =
  | "connected-catalogue"
  | "open-beauty-facts"
  | "user-shelf"
  | "reference-archetype";

export interface SkincareProduct {
  id: string;
  sourceKind: ProductSourceKind;
  name: string;
  brand: string;
  category: FormulationCategory;
  /** Honest price representation: null when non-commercial / open INCI record / not entered */
  price: {
    amount: number;
    currency: string;
  } | null;
  sizeLabel?: string | null;
  imageUrl?: string | null;
  /** EAN / UPC barcode when sourced from Open Beauty Facts */
  barcode?: string | null;
  /** Verified canonical URL on Open Beauty Facts when applicable */
  sourceUrl?: string | null;
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

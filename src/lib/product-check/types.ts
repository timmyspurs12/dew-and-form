import type {
  FormulationCategory,
  IngredientMonograph,
  ProductDataProvenance,
  SkincareProduct,
} from "@/lib/ingredients/types";
import type { CareFocusTheme } from "@/lib/youcam/metadata";

export type ProductClaimKey =
  | "fragrance-free"
  | "gentle-sensitive"
  | "hydrating-barrier"
  | "oil-blemish-control"
  | "brightening-tone"
  | "smoothing-anti-ageing"
  | "broad-spectrum-spf"
  | "non-comedogenic-hypoallergenic"
  | "clinically-proven";

export const PRODUCT_CLAIM_LABELS: Record<ProductClaimKey, string> = {
  "fragrance-free": "Fragrance-free / Unscented",
  "gentle-sensitive": "Gentle / Sensitive-skin friendly",
  "hydrating-barrier": "Hydrating / Barrier-supporting",
  "oil-blemish-control": "Oil-balancing / Blemish-prone care",
  "brightening-tone": "Brightening / Even-looking tone",
  "smoothing-anti-ageing": "Smoothing / Fine-line support",
  "broad-spectrum-spf": "Broad-spectrum SPF / UV protection",
  "non-comedogenic-hypoallergenic": "Non-comedogenic / Hypoallergenic",
  "clinically-proven": "Clinically proven / Dermatologist tested",
};

export type SensitivityFlag =
  | "fragrance"
  | "essential-oils"
  | "drying-alcohol"
  | "exfoliating-acids"
  | "retinoids"
  | "benzoyl-peroxide"
  | "sulfates"
  | "lanolin-cholesterol"
  | "silicones";

export const SENSITIVITY_FLAG_LABELS: Record<SensitivityFlag, string> = {
  fragrance: "Fragrance / Parfum & aroma allergens",
  "essential-oils": "Volatile essential oils (lavender, citrus, tea tree, peppermint)",
  "drying-alcohol": "Denatured / short-chain drying alcohol",
  "exfoliating-acids": "Leave-on exfoliating acids (AHA / BHA)",
  retinoids: "Retinoids (retinol, retinal, retinyl esters)",
  "benzoyl-peroxide": "Benzoyl peroxide",
  sulfates: "Anionic sulfate surfactants (SLS / SLES)",
  "lanolin-cholesterol": "Lanolin or animal-derived sterols / cholesterol",
  silicones: "Silicones (dimethicone / siloxanes)",
};

export type UserSkinTypePreference =
  | "Unknown"
  | "Normal"
  | "Dry"
  | "Oily"
  | "Combination"
  | "Sensitive-leaning";

export interface ProductCheckPersonalProfile {
  goals: CareFocusTheme[];
  skinType: UserSkinTypePreference;
  sensitivities: SensitivityFlag[];
  customAllergens: string;
  usesLeaveOnAcidInRoutine: boolean;
  usesRetinoidInRoutine: boolean;
  usesDailySunscreen: "yes" | "no" | "unset";
  budgetMaxAmount: number | null;
  budgetCurrency: string;
}

export const DEFAULT_PERSONAL_PROFILE: ProductCheckPersonalProfile = {
  goals: [],
  skinType: "Unknown",
  sensitivities: [],
  customAllergens: "",
  usesLeaveOnAcidInRoutine: false,
  usesRetinoidInRoutine: false,
  usesDailySunscreen: "unset",
  budgetMaxAmount: null,
  budgetCurrency: "USD",
};

export interface ProductCheckCandidate {
  id: string;
  name: string;
  brand: string;
  category: FormulationCategory;
  inciDeclaration: string;
  provenance: ProductDataProvenance;
  userConfirmedLabel: boolean;
  sourceUrl: string | null;
  barcode: string | null;
  price: {
    amount: number;
    currency: string;
  } | null;
  sizeLabel: string | null;
  statedClaims: ProductClaimKey[];
}

export type ProductCheckVerdictOutcome =
  | "good_potential_fit"
  | "some_concerns"
  | "not_enough_info";

export type ClaimAssessmentStatus =
  | "ingredient_supported"
  | "contradicted_by_inci"
  | "unverifiable_from_inci";

export interface ClaimAssessmentItem {
  claim: ProductClaimKey;
  label: string;
  status: ClaimAssessmentStatus;
  explanation: string;
}

export interface EvaluatedIngredientNote {
  rawLabel: string;
  position: number;
  monograph: IngredientMonograph;
  goalAlignmentLabels: string[];
}

export interface SourceReferenceItem {
  id: string;
  title: string;
  context: string;
  url?: string | null;
}

export interface DataConfidenceReport {
  level: "high" | "moderate" | "low";
  label: string;
  provenanceLabel: string;
  parsedInciCount: number;
  matchedMonographCount: number;
  unverifiedNotes: string[];
}

export interface ProductCheckEvaluationResult {
  verdict: ProductCheckVerdictOutcome;
  verdictTitle: string;
  conclusion: string;
  supportingReasons: string[];
  concerns: string[];
  routineCompatibilityNotes: string[];
  usageCautions: string[];
  ingredientExplanations: EvaluatedIngredientNote[];
  claimAssessments: ClaimAssessmentItem[];
  missingInformation: string[];
  dataConfidence: DataConfidenceReport;
  sourceReferences: SourceReferenceItem[];
  finishedFormulaBoundaryNote: string;
  normalizedProduct: SkincareProduct | null;
}

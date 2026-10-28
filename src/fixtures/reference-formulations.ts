import type { SkincareProduct } from "@/lib/ingredients/types";

/**
 * Non-commercial reference formulation fixtures for development & UI evaluation.
 * Strictly separated from connected retail data:
 * - Zero fabricated third-party brand names
 * - Zero fabricated prices, stock levels, reviews, ratings, or store URLs
 * - Real cosmetic INCI architectures mapped to documented CosIng ingredient roles
 */
export const REFERENCE_FORMULATION_FIXTURES: SkincareProduct[] = [
  {
    id: "fixture-ref-01-humectant-serum",
    sourceKind: "development-fixture",
    name: "Multi-Humectant & Panthenol Serum",
    brand: "Reference Archetype · Non-Commercial Fixture",
    category: "Hydrating Serum",
    price: null,
    sizeLabel: "30 mL reference architecture",
    imageUrl: "/images/editorial-hero.jpg",
    inciDeclaration:
      "Aqua, Glycerin, Panthenol, Propanediol, Sodium Hyaluronate, Centella Asiatica Extract, Allantoin, Citric Acid, Phenoxyethanol, Ethylhexylglycerin",
    keyIngredients: [
      "Glycerin",
      "Panthenol",
      "Sodium Hyaluronate",
      "Centella Asiatica Extract",
      "Allantoin",
    ],
    attributes: ["Fragrance-free", "Essential-oil-free", "Denatured-alcohol-free", "Leave-on"],
    focusThemes: ["hydration-support", "gentle-soothing"],
    surfacedReason:
      "Surfaced when exploring water-binding humectants and soothing conditioning agents without exfoliating acids or fragrance.",
    intendedStepNote: "Applied onto damp skin after cleansing, followed by an emollient moisturiser.",
  },
  {
    id: "fixture-ref-02-azelaic-niacinamide",
    sourceKind: "development-fixture",
    name: "Azelaic & Niacinamide Balancing Emulsion",
    brand: "Reference Archetype · Non-Commercial Fixture",
    category: "Targeted Treatment",
    price: null,
    sizeLabel: "40 mL reference architecture",
    imageUrl: "/images/vessel-emulsion.jpg",
    inciDeclaration:
      "Aqua, Azelaic Acid, Glycerin, Propanediol, Niacinamide, Caprylic/Capric Triglyceride, Dimethicone, Zinc PCA, Bisabolol, Tocopherol, Phenoxyethanol",
    keyIngredients: ["Azelaic Acid", "Niacinamide", "Glycerin", "Zinc PCA", "Bisabolol"],
    attributes: ["Fragrance-free", "Essential-oil-free", "Denatured-alcohol-free", "Leave-on"],
    focusThemes: ["sebum-pore-refinement", "gentle-soothing", "tone-luminosity"],
    surfacedReason:
      "Surfaced for preferences around T-zone shine balance, pore visibility, and redness-conscious tone care.",
    intendedStepNote: "Leave-on emulsion; introduce gradually 2–3 evenings per week before daily use.",
  },
  {
    id: "fixture-ref-03-ceramide-barrier-cream",
    sourceKind: "development-fixture",
    name: "Physiological Lipid & Squalane Cream",
    brand: "Reference Archetype · Non-Commercial Fixture",
    category: "Moisturiser & Barrier Cream",
    price: null,
    sizeLabel: "50 mL reference architecture",
    imageUrl: "/images/vessel-placeholder.jpg",
    inciDeclaration:
      "Aqua, Glycerin, Squalane, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Dimethicone, Ceramide NP, Cholesterol, Panthenol, Tocopherol, Phenoxyethanol",
    keyIngredients: ["Glycerin", "Squalane", "Ceramide NP", "Cholesterol", "Panthenol"],
    attributes: ["Fragrance-free", "Essential-oil-free", "Denatured-alcohol-free", "Leave-on"],
    focusThemes: ["hydration-support", "gentle-soothing", "well-ageing-support"],
    surfacedReason:
      "Surfaced when pairing humectants with stratum-corneum lipid classes (ceramide, cholesterol, squalane) to comfort dry U-zones.",
    intendedStepNote: "Final evening step, or beneath broad-spectrum sunscreen in the morning.",
  },
  {
    id: "fixture-ref-04-glucoside-cleanser",
    sourceKind: "development-fixture",
    name: "Mild Glucoside & Glycerin Gel Wash",
    brand: "Reference Archetype · Non-Commercial Fixture",
    category: "Cleanser",
    price: null,
    sizeLabel: "150 mL reference architecture",
    imageUrl: "/images/vessel-cleanser.jpg",
    inciDeclaration:
      "Aqua, Coco-Glucoside, Glycerin, Cocamidopropyl Betaine, Panthenol, Allantoin, Xanthan Gum, Lactic Acid, Sodium Benzoate",
    keyIngredients: ["Coco-Glucoside", "Glycerin", "Panthenol", "Allantoin"],
    attributes: ["Fragrance-free", "Essential-oil-free", "Denatured-alcohol-free", "Rinse-off"],
    focusThemes: ["gentle-soothing", "hydration-support", "sebum-pore-refinement"],
    surfacedReason:
      "Surfaced as a low-stripping non-ionic cleanser foundation suitable alongside leave-on treatments.",
    intendedStepNote: "Massage briefly over wet skin for 20–30 seconds and rinse with lukewarm water.",
  },
];

import type { SkincareProduct } from "@/lib/ingredients/types";

/**
 * Non-commercial formulation archetypes illustrating common skincare vehicle architectures.
 * Strictly separated from commercial retail claims:
 * - Zero fabricated third-party brand names
 * - Zero fabricated prices, stock levels, reviews, ratings, or store URLs
 * - Real cosmetic INCI architectures mapped to documented CosIng ingredient roles
 */
export const REFERENCE_FORMULATION_FIXTURES: SkincareProduct[] = [
  {
    id: "archetype-01-humectant-serum",
    sourceKind: "reference-archetype",
    name: "Multi-Humectant & Panthenol Serum",
    brand: "Formulation Archetype · Non-Commercial",
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
      "Illustrates a water-binding humectant and soothing conditioning serum architecture without exfoliating acids or fragrance.",
    intendedStepNote: "Applied onto damp skin after cleansing, followed by an emollient moisturiser.",
  },
  {
    id: "archetype-02-azelaic-niacinamide",
    sourceKind: "reference-archetype",
    name: "Azelaic & Niacinamide Balancing Emulsion",
    brand: "Formulation Archetype · Non-Commercial",
    category: "Targeted Treatment",
    price: null,
    sizeLabel: "40 mL reference architecture",
    imageUrl: "/images/vessel-emulsion.jpg",
    inciDeclaration:
      "Aqua, Azelaic Acid, Glycerin, Propanediol, Niacinamide, Caprylic/Capric Triglyceride, Dimethicone, Zinc PCA, Bisabolol, Tocopherol, Phenoxyethanol",
    keyIngredients: ["Azelaic Acid", "Niacinamide", "Glycerin", "Zinc PCA", "Bisabolol"],
    attributes: [
      "Fragrance-free",
      "Essential-oil-free",
      "Denatured-alcohol-free",
      "Leave-on",
    ],
    focusThemes: ["sebum-pore-refinement", "gentle-soothing", "tone-luminosity"],
    surfacedReason:
      "Illustrates a fragrance-free emulsion pairing azelaic acid, niacinamide, and zinc PCA for shine-prone or uneven-feeling zones.",
    intendedStepNote: "Leave-on emulsion; introduce gradually 2–3 evenings per week before daily use.",
  },
  {
    id: "archetype-03-ceramide-barrier-cream",
    sourceKind: "reference-archetype",
    name: "Physiological Lipid & Squalane Cream",
    brand: "Formulation Archetype · Non-Commercial",
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
      "Illustrates humectants paired with stratum-corneum lipid classes (ceramide, cholesterol, squalane) to comfort dry U-zones.",
    intendedStepNote: "Final evening step, or beneath broad-spectrum sunscreen in the morning.",
  },
  {
    id: "archetype-04-glucoside-cleanser",
    sourceKind: "reference-archetype",
    name: "Mild Glucoside & Glycerin Gel Wash",
    brand: "Formulation Archetype · Non-Commercial",
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
      "Illustrates a low-stripping non-ionic glucoside cleanser foundation suitable alongside leave-on actives.",
    intendedStepNote: "Massage briefly over wet skin for 20–30 seconds and rinse with lukewarm water.",
  },
];

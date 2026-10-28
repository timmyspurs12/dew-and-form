import type { IngredientMonograph, ParsedFormulaIngredient } from "./types";

export const INGREDIENT_MONOGRAPHS: IngredientMonograph[] = [
  {
    id: "glycerin",
    inciName: "GLYCERIN",
    commonName: "Glycerin",
    aliases: ["glycerol", "vegetable glycerin"],
    statedRoles: ["Humectant", "Skin conditioning", "Skin protecting", "Viscosity controlling"],
    plainDescription:
      "A foundational water-binding humectant naturally present in the skin's outermost layer (stratum corneum). It attracts and holds water within surface corneocytes to support suppleness.",
    evidenceSummary:
      "Extensively studied in topical dermatology for improving stratum corneum hydration and supporting barrier recovery across dry and normal skin types.",
    sourceAttribution:
      "European Commission CosIng Database; Cosmetic Ingredient Review (CIR) Safety Assessment of Glycerin.",
    limitations:
      "Standard INCI labels do not disclose exact weight percentage; higher concentrations (>15–20%) can feel tackier depending on co-solvents.",
    relatedThemes: ["hydration-support", "well-ageing-support", "gentle-soothing"],
  },
  {
    id: "niacinamide",
    inciName: "NIACINAMIDE",
    commonName: "Vitamin B3 (Niacinamide)",
    aliases: ["nicotinamide", "vitamin b3"],
    statedRoles: ["Smoothing", "Skin conditioning"],
    plainDescription:
      "A water-soluble form of vitamin B3 widely used in leave-on serums and moisturisers to support barrier lipid synthesis, help balance visible sebum shine, and soften uneven tone appearance.",
    evidenceSummary:
      "Published clinical trials typically evaluate topical niacinamide between 2% and 5% for sebum regulation, barrier function, and hyperpigmentation appearance.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Final Report on Niacinamide and Niacin.",
    limitations:
      "INCI placement alone does not reveal whether a formula uses 2%, 5%, or 10%+. Higher concentrations (10%+) are not necessarily more effective and may cause flushing or stinging in reactive individuals.",
    relatedThemes: ["sebum-pore-refinement", "tone-luminosity", "surface-smoothing"],
    cautionNote: "Patch testing is advisable when using concentrated leave-on serums.",
  },
  {
    id: "sodium-hyaluronate",
    inciName: "SODIUM HYALURONATE",
    commonName: "Sodium Hyaluronate (Hyaluronic Acid Salt)",
    aliases: ["hyaluronic acid", "hydrolyzed hyaluronic acid"],
    statedRoles: ["Humectant", "Skin conditioning"],
    plainDescription:
      "The water-soluble sodium salt of hyaluronic acid. It forms a lightweight, breathable moisture-retaining film on the skin surface that temporarily plumps fine dehydration lines.",
    evidenceSummary:
      "Well-documented surface humectant; molecular weight determines whether it sits primarily on the surface film (high MW) or penetrates upper corneocyte layers (low MW).",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Hyaluronates.",
    limitations:
      "INCI names rarely specify molecular weight distribution or total polymer percentage (often effective at 0.1%–1.0%). Best sealed with an occlusive or emollient layer in very dry climates.",
    relatedThemes: ["hydration-support", "well-ageing-support"],
  },
  {
    id: "panthenol",
    inciName: "PANTHENOL",
    commonName: "Panthenol (Pro-Vitamin B5)",
    aliases: ["d-panthenol", "dexpanthenol", "provitamin b5"],
    statedRoles: ["Skin conditioning", "Antistatic"],
    plainDescription:
      "An alcohol analogue of pantothenic acid (vitamin B5) valued as a soothing humectant that helps reduce dry tightness and supports surface comfort.",
    evidenceSummary:
      "Topical dexpanthenol (commonly studied at 1%–5%) demonstrates humectant water-binding and barrier-soothing properties in controlled dermatological formulations.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Panthenol and Pantothenic Acid.",
    limitations:
      "Concentration and emulsion vehicle determine whether it acts as a primary soothing agent or a trace conditioning additive.",
    relatedThemes: ["hydration-support", "gentle-soothing"],
  },
  {
    id: "ceramide-np",
    inciName: "CERAMIDE NP",
    commonName: "Ceramide NP",
    aliases: ["ceramide 3", "ceramide ap", "ceramide eop", "ceramide ns"],
    statedRoles: ["Skin conditioning"],
    plainDescription:
      "A skin-identical sphingolipid that forms part of the intercellular lipid mortar between stratum corneum cells, helping limit moisture loss.",
    evidenceSummary:
      "Peer-reviewed barrier research shows ceramides work most effectively when formulated alongside cholesterol and free fatty acids in balanced physiological ratios.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Ceramides.",
    limitations:
      "Many commercial formulas include ceramides at trace levels (<0.05%) without physiological lipid ratios; INCI order helps indicate whether lipids sit near the base or trace tail of the formula.",
    relatedThemes: ["hydration-support", "gentle-soothing", "well-ageing-support"],
  },
  {
    id: "cholesterol",
    inciName: "CHOLESTEROL",
    commonName: "Cholesterol",
    aliases: [],
    statedRoles: ["Emollient", "Skin conditioning", "Stabilising", "Viscosity controlling"],
    plainDescription:
      "One of the three core lipid classes naturally present in human stratum corneum alongside ceramides and free fatty acids, used to replenish dry, depleted skin surfaces.",
    evidenceSummary:
      "Demonstrated in lipid-barrier studies to accelerate barrier recovery when co-formulated with ceramides and fatty acids.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Cholesterol.",
    limitations:
      "Source (plant-derived vs. wool-derived lanolin sterols) is not distinguishable from the INCI name alone unless stated by the manufacturer.",
    relatedThemes: ["hydration-support", "well-ageing-support"],
  },
  {
    id: "squalane",
    inciName: "SQUALANE",
    commonName: "Squalane",
    aliases: ["plant squalane", "olive squalane", "sugarcane squalane"],
    statedRoles: ["Emollient", "Skin conditioning", "Refatting"],
    plainDescription:
      "A fully saturated, oxidation-stable hydrocarbon emollient derived by hydrogenating squalene. Softens rough surface texture with a light, non-greasy slip.",
    evidenceSummary:
      "Chemically saturated structure resists lipid peroxidation on the skin surface compared with unsaturated plant oils.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Final Report on Squalane and Squalene.",
    limitations:
      "Provides emollient softening and light occlusion rather than water-binding humectancy; works best paired with humectants.",
    relatedThemes: ["hydration-support", "gentle-soothing"],
  },
  {
    id: "centella-asiatica",
    inciName: "CENTELLA ASIATICA EXTRACT",
    commonName: "Centella Asiatica (Cica)",
    aliases: ["madecassoside", "asiaticoside", "asiatic acid", "madecassic acid", "gotu kola"],
    statedRoles: ["Skin conditioning", "Soothing", "Cleansing", "Smoothing"],
    plainDescription:
      "A botanical extract rich in triterpenoid saponins (madecassoside, asiaticoside) frequently formulated into calming serums and creams for redness-prone or dry skin.",
    evidenceSummary:
      "Standardized Centella triterpene extracts have published in-vitro and clinical data supporting antioxidant and skin-soothing activity.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Centella Asiatica-Derived Ingredients.",
    limitations:
      "Botanical extracts vary widely in active triterpene standardization; diluted water extracts differ substantially from purified madecassoside.",
    relatedThemes: ["gentle-soothing", "hydration-support"],
  },
  {
    id: "azelaic-acid",
    inciName: "AZELAIC ACID",
    commonName: "Azelaic Acid",
    aliases: ["potassium azeloyl diglycinate"],
    statedRoles: ["Buffering", "Skin conditioning"],
    plainDescription:
      "A saturated dicarboxylic acid naturally found in grains. In cosmetic concentrations (commonly up to 10%), it is used to refine uneven surface texture, calm visible redness cues, and brighten post-blemish marks.",
    evidenceSummary:
      "Prescription strengths (15%–20%) are clinically established in dermatology; over-the-counter cosmetic suspensions (typically 5%–10%) offer gentler cosmetic tone and texture support.",
    sourceAttribution:
      "European Commission CosIng Database; peer-reviewed dermatological literature on topical dicarboxylic acids.",
    limitations:
      "Cosmetic vs. prescription strength makes a substantial difference; poorly micronized suspensions can feel slightly grainy and may cause mild transient tingling on initial applications.",
    relatedThemes: ["gentle-soothing", "sebum-pore-refinement", "tone-luminosity"],
    cautionNote: "Introduce gradually (2–3 times weekly initially) and avoid applying onto broken skin.",
  },
  {
    id: "salicylic-acid",
    inciName: "SALICYLIC ACID",
    commonName: "Salicylic Acid (BHA)",
    aliases: ["beta hydroxy acid", "bha"],
    statedRoles: ["Keratolytic", "Skin conditioning", "Preservative"],
    plainDescription:
      "An oil-soluble beta-hydroxy acid capable of loosening compacted corneocytes on the skin surface and within sebum-rich follicular openings.",
    evidenceSummary:
      "Well-characterized keratolytic agent in cosmetic leave-on (typically 0.5%–2.0%) and rinse-off cleanser formulations.",
    sourceAttribution:
      "European Commission CosIng Database (Annex III regulated limits); CIR Safety Assessment of Salicylic Acid and Salicylates.",
    limitations:
      "Exfoliating performance depends on both concentration and formulation pH (none of which appear on a standard INCI list). Overuse alongside other acids or retinoids can cause dryness and irritation.",
    relatedThemes: ["sebum-pore-refinement", "surface-smoothing"],
    cautionNote:
      "Avoid combining multiple exfoliating acids in the same routine; pair with daily broad-spectrum sunscreen.",
  },
  {
    id: "lactic-acid",
    inciName: "LACTIC ACID",
    commonName: "Lactic Acid (AHA)",
    aliases: ["sodium lactate"],
    statedRoles: ["Humectant", "Skin conditioning", "Buffering", "Keratolytic"],
    plainDescription:
      "An alpha-hydroxy acid with a larger molecular size than glycolic acid. At trace levels (<0.5%) it adjusts formula pH; at higher levels (5%–10% at low pH) it gently exfoliates and hydrates rough surface texture.",
    evidenceSummary:
      "Demonstrated keratolytic and humectant NMF (natural moisturizing factor) activity depending on concentration and free-acid pH.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Glycolic and Lactic Acid (increases sun sensitivity — pair with SPF).",
    limitations:
      "Often appears near the very end of an INCI list purely as a pH adjuster rather than an active exfoliant; check position in the ingredient list.",
    relatedThemes: ["surface-smoothing", "hydration-support", "tone-luminosity"],
    cautionNote:
      "Alpha-hydroxy acids can increase skin sensitivity to UV light; use broad-spectrum sunscreen daily.",
  },
  {
    id: "ascorbic-acid",
    inciName: "ASCORBIC ACID",
    commonName: "Vitamin C (L-Ascorbic Acid)",
    aliases: ["l-ascorbic acid", "3-o-ethyl ascorbic acid", "sodium ascorbyl phosphate", "ascorbyl glucoside"],
    statedRoles: ["Antioxidant", "Skin conditioning", "Buffering"],
    plainDescription:
      "The pure, biologically active form of vitamin C used in antioxidant serums to defend against environmental free-radical stress and support brighter, more even-looking skin tone.",
    evidenceSummary:
      "Topical L-ascorbic acid (commonly studied at 10%–20% at pH < 3.5, often stabilized with tocopherol and ferulic acid) has strong peer-reviewed evidence for antioxidant photoprotection support and pigment-evening appearance.",
    sourceAttribution:
      "European Commission CosIng Database; peer-reviewed dermatology literature on topical L-ascorbic acid.",
    limitations:
      "Pure L-ascorbic acid oxidizes rapidly when exposed to air, light, and water (turning deep amber/orange), and low-pH aqueous formulas can sting sensitive skin.",
    relatedThemes: ["tone-luminosity", "well-ageing-support"],
  },
  {
    id: "retinol",
    inciName: "RETINOL",
    commonName: "Retinol (Vitamin A)",
    aliases: ["retinal", "retinaldehyde", "retinyl palmitate"],
    statedRoles: ["Skin conditioning"],
    plainDescription:
      "A cosmetic vitamin A derivative converted enzymatically in skin, widely used in evening routines to soften the look of fine expression lines and refine uneven surface texture.",
    evidenceSummary:
      "Extensive clinical literature supports topical retinol (typically 0.1%–1.0%) for improving photoaged fine lines and epidermal turnover over 12+ weeks of consistent use.",
    sourceAttribution:
      "European Commission CosIng Database (EU Regulation restricted concentration limits in cosmetics); CIR Safety Review.",
    limitations:
      "Unstable in oxygen and UV light unless airless-packaged and encapsulated; exact percentage is frequently omitted. Can trigger initial dryness, flaking, and irritation.",
    relatedThemes: ["well-ageing-support", "surface-smoothing"],
    cautionNote:
      "Not recommended during pregnancy or breastfeeding without medical guidance; introduce slowly in evening routines and wear daily sunscreen.",
  },
  {
    id: "tranexamic-acid",
    inciName: "TRANEXAMIC ACID",
    commonName: "Tranexamic Acid",
    aliases: [],
    statedRoles: ["Astringent", "Skin conditioning"],
    plainDescription:
      "A synthetic lysine derivative used topically (commonly 2%–5%) in tone-focused serums to help address uneven pigment appearance and stubborn dark spots alongside sunscreen.",
    evidenceSummary:
      "Growing clinical evidence in cosmetic dermatology when combined with niacinamide, vitamin C derivatives, and strict UV protection.",
    sourceAttribution:
      "European Commission CosIng Database; peer-reviewed clinical dermatology trials on topical tranexamic acid.",
    limitations:
      "Water-soluble molecule with modest penetration unless supported by appropriate delivery enhancers; requires consistent multi-month use alongside UV protection.",
    relatedThemes: ["tone-luminosity"],
  },
  {
    id: "tocopherol",
    inciName: "TOCOPHEROL",
    commonName: "Vitamin E (Tocopherol)",
    aliases: ["tocopheryl acetate", "alpha-tocopherol"],
    statedRoles: ["Antioxidant", "Skin conditioning"],
    plainDescription:
      "A lipid-soluble antioxidant that protects both formula oils and skin surface lipids from oxidative stress.",
    evidenceSummary:
      "Well-established lipid antioxidant; exhibits synergistic stabilization when paired with L-ascorbic acid.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Tocopherols.",
    limitations:
      "Frequently present at <0.5% to stabilize carrier oils in the bottle rather than as a high-dose standalone active.",
    relatedThemes: ["tone-luminosity", "hydration-support", "well-ageing-support"],
  },
  {
    id: "allantoin",
    inciName: "ALLANTOIN",
    commonName: "Allantoin",
    aliases: [],
    statedRoles: ["Skin protecting", "Skin conditioning", "Soothing"],
    plainDescription:
      "A gentle, time-tested soothing compound typically formulated at 0.1%–0.5% to comfort dry, wind-chapped, or easily bothered skin.",
    evidenceSummary:
      "Recognized skin-conditioning and soothing ingredient across cosmetic and over-the-counter skin protectant monographs.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Allantoin.",
    limitations:
      "Low water solubility (~0.5%) naturally caps dissolved concentrations in aqueous serums.",
    relatedThemes: ["gentle-soothing", "hydration-support"],
  },
  {
    id: "zinc-pca",
    inciName: "ZINC PCA",
    commonName: "Zinc PCA",
    aliases: [],
    statedRoles: ["Humectant", "Skin conditioning"],
    plainDescription:
      "The zinc salt of pyrrolidone carboxylic acid (a natural moisturizing factor component), pairing mild humectancy with surface sebum-balancing properties.",
    evidenceSummary:
      "Cosmetic studies evaluate Zinc PCA (commonly 0.2%–1.0%) in lightweight serums and gels aimed at oily or combination T-zones without harsh stripping.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Assessment of PCA and Its Salts.",
    limitations:
      "Supportive cosmetic conditioning ingredient rather than a standalone acne treatment.",
    relatedThemes: ["sebum-pore-refinement"],
  },
  {
    id: "bisabolol",
    inciName: "BISABOLOL",
    commonName: "Alpha-Bisabolol",
    aliases: ["alpha-bisabolol", "levomenol"],
    statedRoles: ["Skin conditioning", "Soothing"],
    plainDescription:
      "A purified sesquiterpene alcohol (traditionally isolated from chamomile or sustainably bio-fermented) prized for calming visible redness cues without whole-essential-oil allergens.",
    evidenceSummary:
      "Documented soothing activity at low use levels (0.1%–0.5%) in leave-on barrier emulsions.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Bisabolol.",
    limitations:
      "Individuals with known Asteraceae/Compositae plant allergies should still patch test.",
    relatedThemes: ["gentle-soothing"],
  },
  {
    id: "dimethicone",
    inciName: "DIMETHICONE",
    commonName: "Dimethicone",
    aliases: ["polydimethylsiloxane"],
    statedRoles: ["Emollient", "Skin conditioning", "Skin protecting", "Antifoaming"],
    plainDescription:
      "An inert, breathable silicone polymer that fills micro-irregularities for silky slip and forms a semi-permeable barrier to slow water evaporation without oiliness.",
    evidenceSummary:
      "Widely used in dermatology moisturizers for sensitive and rosacea-prone skin due to chemical inertness and low sensitization potential.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Dimethicone and Methicone Polymers.",
    limitations:
      "Provides surface smoothing and water-loss reduction rather than bioactive cellular signaling.",
    relatedThemes: ["hydration-support", "gentle-soothing"],
  },
  {
    id: "caprylic-capric-triglyceride",
    inciName: "CAPRYLIC/CAPRIC TRIGLYCERIDE",
    commonName: "Caprylic/Capric Triglyceride",
    aliases: ["fractionated coconut esters"],
    statedRoles: ["Emollient", "Skin conditioning", "Solvent"],
    plainDescription:
      "A lightweight, oxidation-stable ester of glycerin with caprylic and capric fatty acids that lends smooth spreadability to creams and emulsions.",
    evidenceSummary:
      "Standard dermatological emollient vehicle with a long safety record across leave-on and rinse-off skincare.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Caprylic/Capric Triglyceride.",
    limitations:
      "Vehicle emollient; individual tolerance varies depending on overall emulsion richness.",
    relatedThemes: ["hydration-support"],
  },
  {
    id: "coco-glucoside",
    inciName: "COCO-GLUCOSIDE",
    commonName: "Coco-Glucoside",
    aliases: ["decyl glucoside", "lauryl glucoside"],
    statedRoles: ["Surfactant — cleansing", "Foaming"],
    plainDescription:
      "A non-ionic alkyl polyglucoside surfactant derived from fatty alcohols and glucose sugars, used in low-foam gel cleansers to lift sebum and sunscreen gently.",
    evidenceSummary:
      "Demonstrates lower protein-denaturing irritation potential on the stratum corneum than traditional harsh anionic sulfates.",
    sourceAttribution:
      "European Commission CosIng Database; CIR Safety Assessment of Decyl Glucoside and Other Alkyl Glucosides.",
    limitations:
      "Rinse-off cleansing agent; contact time on skin is brief, and mildness depends on the complete surfactant blend and formula pH.",
    relatedThemes: ["gentle-soothing", "sebum-pore-refinement"],
  },
  {
    id: "aqua",
    inciName: "AQUA",
    commonName: "Purified Water",
    aliases: ["water", "aqua / water", "aqua/water", "eau"],
    statedRoles: ["Solvent"],
    plainDescription:
      "Deionized or purified water acting as the primary solvent base for water-based serums, gels, cleansers, and oil-in-water emulsions.",
    evidenceSummary:
      "Universal cosmetic solvent enabling water-soluble humectants and electrolytes to dissolve evenly.",
    sourceAttribution: "European Commission CosIng Database.",
    limitations:
      "Water-containing formulas require a broad-spectrum preservative system to remain microbiologically safe.",
    relatedThemes: [],
  },
];

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9/+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findIngredientMonograph(rawName: string): IngredientMonograph | null {
  const token = normalizeToken(rawName);
  if (!token) return null;

  for (const mono of INGREDIENT_MONOGRAPHS) {
    const candidates = [
      normalizeToken(mono.inciName),
      normalizeToken(mono.commonName),
      ...mono.aliases.map(normalizeToken),
    ];
    if (candidates.some((c) => c === token || (c.length >= 5 && token.includes(c)))) {
      return mono;
    }
  }
  return null;
}

export function cleanRawInciText(raw: string): string {
  return raw
    .replace(/^\s*ingredients?\s*:?\s*/i, "")
    .replace(/\bPlease be aware that ingredient lists[\s\S]*$/i, "")
    .replace(/\*\s*Ingr[ée]dients?\s+issus[\s\S]*$/i, "")
    .replace(/\bLote\s*:[\s\S]*$/i, "")
    .replace(/\(\s*F\.?I\.?L\.?\s*[^)]*\)/gi, "")
    .replace(/\[[A-Z0-9._-]{3,}\]/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .trim();
}

export function parseInciDeclaration(inciDeclaration: string | null | undefined): ParsedFormulaIngredient[] {
  if (!inciDeclaration || !inciDeclaration.trim()) {
    return [];
  }

  const cleaned = cleanRawInciText(inciDeclaration);
  if (!cleaned) {
    return [];
  }

  // Some European packaging labels separate INCI entries with " - " rather than commas
  const hasStandardDelimiters = /(?<!\d),(?!\d)|[;•\n]/.test(cleaned);
  const rawTokens = hasStandardDelimiters
    ? cleaned.split(/(?<!\d),(?!\d)|[;•\n]+/)
    : /\s+-\s+/.test(cleaned)
      ? cleaned.split(/\s+-\s+/)
      : [cleaned];

  return rawTokens
    .map((part) => part.replace(/^[-•*\s]+|[-•*\s.]+$/g, "").trim())
    .filter((part) => part.length > 0)
    .map((rawLabel, index) => ({
      position: index + 1,
      rawLabel,
      monograph: findIngredientMonograph(rawLabel),
    }));
}

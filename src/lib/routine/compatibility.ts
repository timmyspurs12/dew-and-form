import { cleanRawInciText, parseInciDeclaration } from "@/lib/ingredients/catalog";
import type { FormulationCategory, SkincareProduct } from "@/lib/ingredients/types";

export type RoutineTimeSlot = "morning" | "evening";

export interface RoutineCompatibilityWarning {
  id: string;
  slot: RoutineTimeSlot | "cross-routine";
  severity: "caution" | "note";
  title: string;
  explanation: string;
  involvedProductNames: string[];
}

const CATEGORY_ORDER: Record<FormulationCategory, number> = {
  Cleanser: 1,
  "Toner & Essence": 2,
  "Hydrating Serum": 3,
  "Targeted Treatment": 4,
  "Moisturiser & Barrier Cream": 5,
  Sunscreen: 6,
};

const ACID_RE =
  /\b(salicylic\s+acid|glycolic\s+acid|lactic\s+acid|mandelic\s+acid|gluconolactone|lactobionic\s+acid)\b/i;
const AHA_RE = /\b(glycolic\s+acid|lactic\s+acid|mandelic\s+acid)\b/i;
const RETINOID_RE =
  /\b(retinol|retinal|retinaldehyde|retinyl\s+palmitate|hydroxypinacolone\s+retinoate)\b/i;
const BPO_RE = /\b(benzoyl\s+peroxide)\b/i;
const PURE_VIT_C_RE = /\b(ascorbic\s+acid|l-ascorbic\s+acid)\b/i;

export function sortRoutineProductsByLayerOrder(products: SkincareProduct[]): SkincareProduct[] {
  return [...products].sort(
    (a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99)
  );
}

export function explainProductRoutineRole(
  product: SkincareProduct,
  slot: RoutineTimeSlot
): { stepBadge: string; roleExplanation: string } {
  const highlights =
    product.keyIngredients.length > 0
      ? ` featuring ${product.keyIngredients.slice(0, 3).join(", ")}`
      : "";

  switch (product.category) {
    case "Cleanser":
      return {
        stepBadge: "Step · Cleanse",
        roleExplanation:
          slot === "morning"
            ? `Rinse-off cleanser${highlights} to refresh overnight sebum gently without stripping surface lipids.`
            : `Evening cleanse${highlights} to lift daily sunscreen, surface sebum, and airborne particulates before leave-on care.`,
      };
    case "Toner & Essence":
      return {
        stepBadge: "Step · Prep & Hydrate",
        roleExplanation: `Lightweight aqueous layer${highlights} applied after cleansing to dampen the stratum corneum.`,
      };
    case "Hydrating Serum":
      return {
        stepBadge: "Step · Humectant Serum",
        roleExplanation: `Water-binding conditioning step${highlights} worn beneath a lipid moisturiser to support surface suppleness.`,
      };
    case "Targeted Treatment":
      return {
        stepBadge: "Step · Targeted Active",
        roleExplanation: `Focused leave-on treatment${highlights}; pace weekly frequency to your barrier comfort.`,
      };
    case "Moisturiser & Barrier Cream":
      return {
        stepBadge: "Step · Barrier Seal",
        roleExplanation: `Emollient and lipid seal${highlights} to soften dry texture and slow transepidermal water loss.`,
      };
    case "Sunscreen":
      return {
        stepBadge: "Step · UV Protection",
        roleExplanation:
          slot === "morning"
            ? `Final morning daytime step${highlights} to help shield skin from UVA/UVB exposure.`
            : `Daytime UV protection formula—typically needed in your Morning routine rather than overnight.`,
      };
  }
}

function inspectRoutineItemActives(product: SkincareProduct) {
  const cleaned = cleanRawInciText(product.inciDeclaration || "");
  const parsed = parseInciDeclaration(cleaned);
  const isLeaveOn = product.category !== "Cleanser";

  const acidPositions = parsed
    .filter((p) => ACID_RE.test(p.rawLabel))
    .map((p) => ({ label: p.rawLabel, pos: p.position }));

  const hasLeaveOnAcid =
    isLeaveOn &&
    (product.attributes.includes("Contains exfoliating acid") ||
      acidPositions.some(
        (entry) => !/lactic\s+acid/i.test(entry.label) || entry.pos <= 8 || parsed.length <= 8
      ));

  const hasAha = isLeaveOn && AHA_RE.test(cleaned) && hasLeaveOnAcid;
  const hasRetinoid =
    isLeaveOn && (product.attributes.includes("Contains retinoid") || RETINOID_RE.test(cleaned));
  const hasBpo = BPO_RE.test(cleaned);
  const hasPureVitC =
    isLeaveOn && PURE_VIT_C_RE.test(cleaned) && !/ascorbyl|ethyl\s+ascorbic/i.test(cleaned);

  return {
    hasLeaveOnAcid,
    hasAha,
    hasRetinoid,
    hasBpo,
    hasPureVitC,
  };
}

/**
 * Checks a user's assembled AM & PM routines for documented cosmetic compatibility
 * considerations without inventing clinical diagnoses or pushing unnecessary purchases.
 */
export function evaluateRoutineCompatibility(params: {
  morningProducts: SkincareProduct[];
  eveningProducts: SkincareProduct[];
}): RoutineCompatibilityWarning[] {
  const warnings: RoutineCompatibilityWarning[] = [];

  const checkSlot = (slot: RoutineTimeSlot, items: SkincareProduct[]) => {
    const analyzed = items.map((product) => ({
      product,
      flags: inspectRoutineItemActives(product),
    }));

    const acidItems = analyzed.filter((x) => x.flags.hasLeaveOnAcid).map((x) => x.product);
    const retinoidItems = analyzed.filter((x) => x.flags.hasRetinoid).map((x) => x.product);
    const bpoItems = analyzed.filter((x) => x.flags.hasBpo).map((x) => x.product);
    const vitCItems = analyzed.filter((x) => x.flags.hasPureVitC).map((x) => x.product);

    if (acidItems.length >= 2) {
      warnings.push({
        id: `${slot}-multiple-acids`,
        slot,
        severity: "caution",
        title: `Multiple leave-on exfoliating acids in ${slot} routine`,
        explanation:
          "Layering two leave-on AHA/BHA exfoliants in the same session increases stinging, flaking, and barrier dryness. Consider alternating them on separate days or keeping only one.",
        involvedProductNames: acidItems.map((p) => p.name),
      });
    }

    if (acidItems.length >= 1 && retinoidItems.length >= 1) {
      warnings.push({
        id: `${slot}-acid-retinoid-stack`,
        slot,
        severity: "caution",
        title: `Exfoliating acid + retinoid paired in ${slot} routine`,
        explanation:
          "Applying leave-on exfoliating acids and retinoids in the same routine frequently triggers irritation. Alternate evenings (skin cycling) instead of layering both on the same night.",
        involvedProductNames: [
          ...acidItems.map((p) => p.name),
          ...retinoidItems.map((p) => p.name),
        ],
      });
    }

    if (bpoItems.length >= 1 && (retinoidItems.length >= 1 || vitCItems.length >= 1)) {
      warnings.push({
        id: `${slot}-bpo-oxidation`,
        slot,
        severity: "caution",
        title: `Benzoyl peroxide paired with retinoid or L-ascorbic acid`,
        explanation:
          "Benzoyl peroxide is an oxidizing agent that can degrade standard retinol or pure L-ascorbic acid and amplify dryness when applied together—separate into AM vs. PM or alternate days.",
        involvedProductNames: [
          ...bpoItems.map((p) => p.name),
          ...retinoidItems.map((p) => p.name),
          ...vitCItems.map((p) => p.name),
        ],
      });
    }

    if (slot === "morning" && retinoidItems.length >= 1) {
      warnings.push({
        id: "morning-retinoid-placement",
        slot: "morning",
        severity: "caution",
        title: "Retinoid placed in Morning (AM) routine",
        explanation:
          "Traditional retinol and retinal degrade in daylight UV exposure—moving retinoid steps to your Evening (PM) routine preserves stability.",
        involvedProductNames: retinoidItems.map((p) => p.name),
      });
    }

    if (slot === "evening") {
      const spfInPm = items.filter((p) => p.category === "Sunscreen");
      if (spfInPm.length > 0) {
        warnings.push({
          id: "evening-sunscreen-placement",
          slot: "evening",
          severity: "note",
          title: "Sunscreen assigned to Evening (PM) routine",
          explanation:
            "UV filters are designed for daytime protection—use a plain barrier moisturiser at night and keep sunscreen in your Morning slot.",
          involvedProductNames: spfInPm.map((p) => p.name),
        });
      }
    }

    const cleansers = items.filter((p) => p.category === "Cleanser");
    if (slot === "morning" && cleansers.length >= 2) {
      warnings.push({
        id: "morning-duplicate-cleansers",
        slot: "morning",
        severity: "note",
        title: "Two cleansers in Morning routine",
        explanation:
          "A single mild morning wash (or lukewarm water rinse on dry skin) is typically plenty—double cleansing is mainly helpful in the evening when removing tenacious sunscreen or makeup.",
        involvedProductNames: cleansers.map((p) => p.name),
      });
    }
  };

  checkSlot("morning", params.morningProducts);
  checkSlot("evening", params.eveningProducts);

  // Cross-routine photoprotection reminder when PM/AM contains AHA or retinoid without AM SPF
  const allItems = [...params.morningProducts, ...params.eveningProducts];
  const usesPhotosensitizingRenewal = allItems.some((p) => {
    const f = inspectRoutineItemActives(p);
    return f.hasAha || f.hasRetinoid;
  });
  const hasMorningSunscreen = params.morningProducts.some((p) => p.category === "Sunscreen");

  if (usesPhotosensitizingRenewal && !hasMorningSunscreen) {
    warnings.push({
      id: "cross-missing-morning-spf",
      slot: "cross-routine",
      severity: "caution",
      title: "Renewal active present without a Morning Sunscreen listed",
      explanation:
        "Alpha-hydroxy acids and retinoids increase UV sensitivity. Remember to finish your morning routine with a broad-spectrum SPF 30+ you already trust.",
      involvedProductNames: [],
    });
  }

  return warnings;
}

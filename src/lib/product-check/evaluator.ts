import {
  cleanRawInciText,
  isFeaturedKeyMonograph,
  parseInciDeclaration,
} from "@/lib/ingredients/catalog";
import type {
  FormulationAttribute,
  ProductDataProvenance,
  SkincareProduct,
} from "@/lib/ingredients/types";
import { CARE_THEME_METADATA, type CareFocusTheme } from "@/lib/youcam/metadata";
import {
  PRODUCT_CLAIM_LABELS,
  SENSITIVITY_FLAG_LABELS,
  type ClaimAssessmentItem,
  type DataConfidenceReport,
  type EvaluatedIngredientNote,
  type ProductCheckCandidate,
  type ProductCheckEvaluationResult,
  type ProductCheckPersonalProfile,
  type SensitivityFlag,
  type SourceReferenceItem,
} from "./types";

const FRAGRANCE_RE =
  /\b(parfum|fragrance|aroma|limonene|linalool|citronellol|geraniol|eugenol|citral|coumarin|hexyl cinnamal|benzyl salicylate|alpha-isomethyl ionone|hydroxycitronellal|cinnamyl alcohol)\b/i;

const ESSENTIAL_OIL_RE =
  /\b(lavandula|lavender\s+oil|mentha\s+piperita|peppermint\s+oil|eucalyptus|melaleuca|tea\s+tree|rosmarinus|rosemary\s+oil|citrus\s+\w+\s+(?:peel\s+|fruit\s+)?oil|bergamot|ylang)\b/i;

const DRYING_ALCOHOL_RE =
  /\b(alcohol\s+denat\.?|denatured\s+alcohol|sd\s+alcohol|isopropyl\s+alcohol)\b/i;

const FATTY_ALCOHOL_SAFE_RE =
  /\b(cetyl\s+alcohol|cetearyl\s+alcohol|stearyl\s+alcohol|behenyl\s+alcohol|arachidyl\s+alcohol|brassica\s+alcohol)\b/i;

const EXFOLIATING_ACID_RE =
  /\b(salicylic\s+acid|glycolic\s+acid|lactic\s+acid|mandelic\s+acid|gluconolactone|lactobionic\s+acid)\b/i;

const AHA_PHOTOSENSITIZING_RE = /\b(glycolic\s+acid|lactic\s+acid|mandelic\s+acid)\b/i;

const RETINOID_RE =
  /\b(retinol|retinal|retinaldehyde|retinyl\s+palmitate|retinyl\s+propionate|hydroxypinacolone\s+retinoate)\b/i;

const BENZOYL_PEROXIDE_RE = /\b(benzoyl\s+peroxide)\b/i;

const SULFATE_RE =
  /\b(sodium\s+lauryl\s+sulfate|sodium\s+laureth\s+sulfate|ammonium\s+lauryl\s+sulfate)\b/i;

const LANOLIN_CHOLESTEROL_RE = /\b(lanolin|cholesterol|adeps\s+lanae)\b/i;

const SILICONE_RE =
  /\b(dimethicone|cyclopentasiloxane|cyclohexasiloxane|amodimethicone|phenyl\s+trimethicone|caprylyl\s+methicone|trisiloxane)\b/i;

const UV_FILTER_RE =
  /\b(zinc\s+oxide|titanium\s+dioxide|bis-ethylhexyloxyphenol\s+methoxyphenyl\s+triazine|ethylhexyl\s+triazone|diethylamino\s+hydroxybenzoyl\s+hexyl\s+benzoate|butyl\s+methoxydibenzoylmethane|avobenzone|homosalate|octocrylene|ethylhexyl\s+salicylate|terephthalylidene\s+dicamphor\s+sulfonic\s+acid|drometrizole\s+trisiloxane)\b/i;

export interface RoutineContextInput {
  morningProducts?: SkincareProduct[];
  eveningProducts?: SkincareProduct[];
}

export function getProvenanceLabel(
  provenance: ProductDataProvenance,
  userConfirmedLabel: boolean
): string {
  if (provenance === "confirmed-packaging-label" || userConfirmedLabel) {
    return "Confirmed packaging label text (verified by user)";
  }
  if (provenance === "open-beauty-facts-crowd") {
    return "Third-party open registry (Open Beauty Facts ODbL — crowd-submitted; formulas vary by region & reformulation date)";
  }
  if (provenance === "reference-archetype") {
    return "Dew & Form non-commercial reference archetype";
  }
  if (provenance === "unverified-url") {
    return "Retrieved from web URL — product identity or full INCI list not verified against physical packaging";
  }
  return "Manual entry — packaging label not yet confirmed";
}

function detectFormulaSignals(cleanedInci: string, parsedTokens: string[]) {
  const hasFragrance = FRAGRANCE_RE.test(cleanedInci);
  const hasEssentialOil = ESSENTIAL_OIL_RE.test(cleanedInci);

  const dryingAlcoholPositions: number[] = [];
  parsedTokens.forEach((tok, idx) => {
    if (!FATTY_ALCOHOL_SAFE_RE.test(tok) && DRYING_ALCOHOL_RE.test(tok)) {
      dryingAlcoholPositions.push(idx + 1);
    }
  });

  const hasDryingAlcohol = dryingAlcoholPositions.length > 0;
  const hasHighPositionDryingAlcohol = dryingAlcoholPositions.some((pos) => pos <= 6);

  // Check if lactic acid is only at the very tail (>8th entry) as a trace pH buffer
  const exfoliatingPositions: Array<{ label: string; pos: number }> = [];
  parsedTokens.forEach((tok, idx) => {
    if (EXFOLIATING_ACID_RE.test(tok)) {
      exfoliatingPositions.push({ label: tok, pos: idx + 1 });
    }
  });
  const hasMeaningfulExfoliatingAcid = exfoliatingPositions.some(
    (entry) => !/lactic\s+acid/i.test(entry.label) || entry.pos <= 8 || parsedTokens.length <= 8
  );

  const hasAha = AHA_PHOTOSENSITIZING_RE.test(cleanedInci) && hasMeaningfulExfoliatingAcid;
  const hasRetinoid = RETINOID_RE.test(cleanedInci);
  const hasBenzoylPeroxide = BENZOYL_PEROXIDE_RE.test(cleanedInci);
  const hasSulfates = SULFATE_RE.test(cleanedInci);
  const hasLanolinOrCholesterol = LANOLIN_CHOLESTEROL_RE.test(cleanedInci);
  const hasSilicones = SILICONE_RE.test(cleanedInci);
  const hasUvFilter = UV_FILTER_RE.test(cleanedInci);

  return {
    hasFragrance,
    hasEssentialOil,
    hasDryingAlcohol,
    hasHighPositionDryingAlcohol,
    dryingAlcoholPositions,
    hasMeaningfulExfoliatingAcid,
    hasAha,
    hasRetinoid,
    hasBenzoylPeroxide,
    hasSulfates,
    hasLanolinOrCholesterol,
    hasSilicones,
    hasUvFilter,
  };
}

function buildAttributesForCandidate(
  candidate: ProductCheckCandidate,
  signals: ReturnType<typeof detectFormulaSignals>
): FormulationAttribute[] {
  const attrs: FormulationAttribute[] = [];
  if (signals.hasFragrance) {
    attrs.push("Contains fragrance");
  } else {
    attrs.push("Fragrance-free");
  }
  if (!signals.hasEssentialOil) {
    attrs.push("Essential-oil-free");
  }
  if (!signals.hasDryingAlcohol) {
    attrs.push("Denatured-alcohol-free");
  }
  attrs.push(candidate.category === "Cleanser" ? "Rinse-off" : "Leave-on");
  if (signals.hasMeaningfulExfoliatingAcid) {
    attrs.push("Contains exfoliating acid");
  }
  if (signals.hasRetinoid) {
    attrs.push("Contains retinoid");
  }
  return attrs;
}

/**
 * Evaluates a skincare product candidate transparently against its INCI list,
 * documented CosIng/CIR ingredient monographs, stated marketing claims,
 * and optional user goals, sensitivities, and active routine context.
 *
 * Strictly avoids fabricating concentrations, clinical efficacy, non-comedogenicity,
 * or universal safety verdicts.
 */
export function evaluateProductCheck(
  candidate: ProductCheckCandidate,
  profile: ProductCheckPersonalProfile,
  routineContext?: RoutineContextInput
): ProductCheckEvaluationResult {
  const trimmedName = candidate.name.trim() || "Unnamed Skincare Product";
  const trimmedBrand = candidate.brand.trim() || "Brand not specified";
  const cleanedInci = cleanRawInciText(candidate.inciDeclaration || "");
  const parsed = parseInciDeclaration(cleanedInci);
  const rawTokens = parsed.map((p) => p.rawLabel);

  const matchedNotes: EvaluatedIngredientNote[] = [];
  const seenMonoIds = new Set<string>();
  for (const entry of parsed) {
    if (!entry.monograph || seenMonoIds.has(entry.monograph.id)) continue;
    seenMonoIds.add(entry.monograph.id);
    const alignedLabels = entry.monograph.relatedThemes
      .filter((t) => profile.goals.includes(t))
      .map((t) => CARE_THEME_METADATA[t].label);
    matchedNotes.push({
      rawLabel: entry.rawLabel,
      position: entry.position,
      monograph: entry.monograph,
      goalAlignmentLabels: alignedLabels,
    });
  }

  const provenanceLabel = getProvenanceLabel(
    candidate.provenance,
    candidate.userConfirmedLabel
  );

  const unverifiedNotes: string[] = [
    "Exact active weight percentages (%) and free-acid formulation pH are not disclosed on standard cosmetic INCI declarations.",
    "Ingredient-level published research does not prove clinical performance, stability, or skin penetration of this specific finished formula.",
  ];

  if (candidate.provenance === "open-beauty-facts-crowd" && !candidate.userConfirmedLabel) {
    unverifiedNotes.unshift(
      "Ingredient list was retrieved from crowd-contributed Open Beauty Facts data—brands reformulate over time and across regions, so compare against your physical box."
    );
  } else if (candidate.provenance === "unverified-url" && !candidate.userConfirmedLabel) {
    unverifiedNotes.unshift(
      "Retrieved from an external web URL without packaging verification—confirm the full INCI list on the physical container before relying on allergen checks."
    );
  }

  const finishedFormulaBoundaryNote =
    "Evidence boundary: Monograph notes below describe documented ingredient-level roles (CosIng / CIR) at commonly studied concentrations. They do not establish clinical proof, non-comedogenicity, or personal tolerance for the finished formulation.";

  // Build verifiable source references strictly from matched monographs + OBF URL if present
  const sourceReferences: SourceReferenceItem[] = [
    {
      id: "ec-cosing",
      title: "European Commission CosIng Cosmetic Ingredients Database",
      context:
        "Reference nomenclature and stated cosmetic ingredient functions (Regulation (EC) No 1223/2009).",
    },
  ];

  if (matchedNotes.some((n) => n.monograph.sourceAttribution.includes("CIR"))) {
    sourceReferences.push({
      id: "cir-assessments",
      title: "Cosmetic Ingredient Review (CIR) Expert Panel Safety Assessments",
      context:
        "Published ingredient-level safety & concentration context for matched cosmetic components.",
    });
  }

  if (
    matchedNotes.some(
      (n) =>
        n.monograph.sourceAttribution.includes("SCCS") ||
        n.monograph.sourceAttribution.includes("Annex")
    )
  ) {
    sourceReferences.push({
      id: "eu-annex-sccs",
      title: "EU Cosmetics Regulation (EC) No 1223/2009 Annexes III, V & VI / SCCS Opinions",
      context:
        "Regulated fragrance allergen disclosure rules, preservative caps, and authorized UV filter schedules.",
    });
  }

  if (candidate.sourceUrl) {
    sourceReferences.push({
      id: "obf-record",
      title: `Open Beauty Facts Product Record${candidate.barcode ? ` (#${candidate.barcode})` : ""}`,
      context:
        "Open Database License (ODbL) crowd-contributed packaging record used as initial product source.",
      url: candidate.sourceUrl,
    });
  }

  // CASE 1: Insufficient INCI information (< 3 parsed INCI tokens)
  if (parsed.length < 3) {
    const missingInformation: string[] = [];
    if (parsed.length === 0) {
      missingInformation.push(
        "Full packaging INCI ingredient declaration is missing (only product name or partial metadata is present)."
      );
    } else {
      missingInformation.push(
        `Only ${parsed.length} ingredient token${parsed.length === 1 ? "" : "s"} provided (${rawTokens.join(", ")})—a complete cosmetic INCI declaration typically lists the solvent base, functional actives, emulsifiers, and preservatives in descending order.`
      );
    }
    missingInformation.push(
      "Paste or transcribe the full comma-separated 'Ingredients' list from the product carton or brand INCI disclosure above to run a meaningful check."
    );

    const dataConfidence: DataConfidenceReport = {
      level: "low",
      label: "Low confidence — incomplete ingredient list",
      provenanceLabel,
      parsedInciCount: parsed.length,
      matchedMonographCount: matchedNotes.length,
      unverifiedNotes,
    };

    const claimAssessments: ClaimAssessmentItem[] = candidate.statedClaims.map((claim) => ({
      claim,
      label: PRODUCT_CLAIM_LABELS[claim],
      status: "unverifiable_from_inci",
      explanation:
        "Cannot evaluate this claim because a complete INCI ingredient list has not been provided yet.",
    }));

    return {
      verdict: "not_enough_info",
      verdictTitle: "Not enough information",
      conclusion: `Dew & Form cannot reliably evaluate "${trimmedName}" from its name${parsed.length > 0 ? " and partial ingredient note" : ""} alone. Provide the complete packaging INCI ingredient list to check functional roles, personal sensitivities, and routine compatibility.`,
      supportingReasons:
        matchedNotes.length > 0
          ? matchedNotes.map(
              (n) =>
                `Recognised ${n.monograph.commonName} (${n.monograph.statedRoles.join(", ")}), but surrounding vehicle, surfactant, fragrance, and preservative ingredients are missing.`
            )
          : [],
      concerns: [],
      routineCompatibilityNotes: [],
      usageCautions: [
        "Never assume a product is allergen-free or gentle when only hero marketing ingredients are listed.",
      ],
      ingredientExplanations: matchedNotes,
      claimAssessments,
      missingInformation,
      dataConfidence,
      sourceReferences,
      finishedFormulaBoundaryNote,
      normalizedProduct: null,
    };
  }

  // Full multi-ingredient INCI analysis
  const signals = detectFormulaSignals(cleanedInci, rawTokens);
  const supportingReasons: string[] = [];
  const concerns: string[] = [];
  const routineCompatibilityNotes: string[] = [];
  const usageCautions: string[] = [];

  const isLeaveOn = candidate.category !== "Cleanser";

  // 1. Evaluate Personal Sensitivities & Custom Allergens
  const checkSensitivity = (flag: SensitivityFlag, triggered: boolean, detail: string) => {
    if (profile.sensitivities.includes(flag) && triggered) {
      concerns.push(`Personal sensitivity conflict (${SENSITIVITY_FLAG_LABELS[flag]}): ${detail}`);
    }
  };

  checkSensitivity(
    "fragrance",
    signals.hasFragrance,
    "The INCI list contains fragrance / parfum or regulated aromatic allergen compounds (e.g. linalool, limonene, citronellol)."
  );
  checkSensitivity(
    "essential-oils",
    signals.hasEssentialOil,
    "The INCI list includes volatile plant essential oils, which contain aromatic terpenes that can trigger contact sensitivity."
  );
  checkSensitivity(
    "drying-alcohol",
    signals.hasDryingAlcohol,
    `Short-chain denatured alcohol appears at INCI position ${signals.dryingAlcoholPositions.join(", ")}.`
  );
  checkSensitivity(
    "exfoliating-acids",
    signals.hasMeaningfulExfoliatingAcid,
    "Contains an alpha- or beta-hydroxy keratolytic acid (e.g. glycolic, lactic, or salicylic acid)."
  );
  checkSensitivity(
    "retinoids",
    signals.hasRetinoid,
    "Contains a vitamin A derivative (retinoid)."
  );
  checkSensitivity(
    "benzoyl-peroxide",
    signals.hasBenzoylPeroxide,
    "Contains benzoyl peroxide, which can cause dryness or contact irritation on reactive skin."
  );
  checkSensitivity(
    "sulfates",
    signals.hasSulfates,
    "Contains anionic sulfate surfactants (SLS / SLES)."
  );
  checkSensitivity(
    "lanolin-cholesterol",
    signals.hasLanolinOrCholesterol,
    "Contains lanolin or cholesterol sterols."
  );
  checkSensitivity(
    "silicones",
    signals.hasSilicones,
    "Contains silicone polymers (such as dimethicone or siloxanes)."
  );

  // Custom user-entered allergen tokens
  const customTerms = profile.customAllergens
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  for (const term of customTerms) {
    const lowerTerm = term.toLowerCase();
    const matchedToken = rawTokens.find((tok) => tok.toLowerCase().includes(lowerTerm));
    if (matchedToken) {
      concerns.push(
        `Custom allergen / ingredient flag: "${matchedToken}" in this INCI list matches your excluded ingredient "${term}".`
      );
    }
  }

  // 2. Evaluate Skin Type & Soothing Goal Conflicts
  const isSensitiveOrSoothing =
    profile.skinType === "Sensitive-leaning" || profile.goals.includes("gentle-soothing");
  const isDrySkin = profile.skinType === "Dry";

  if (
    isSensitiveOrSoothing &&
    signals.hasFragrance &&
    !profile.sensitivities.includes("fragrance")
  ) {
    concerns.push(
      "Contains fragrance or aromatic allergen components, which may increase stinging or contact reactivity when targeting calm, redness-conscious care."
    );
  }

  if (
    isSensitiveOrSoothing &&
    signals.hasEssentialOil &&
    !profile.sensitivities.includes("essential-oils")
  ) {
    concerns.push(
      "Contains volatile essential oils, which can irritate sensitive or redness-prone skin barriers."
    );
  }

  if (
    (isDrySkin || isSensitiveOrSoothing) &&
    signals.hasHighPositionDryingAlcohol &&
    candidate.category !== "Sunscreen" &&
    !profile.sensitivities.includes("drying-alcohol")
  ) {
    concerns.push(
      `Alcohol Denat. appears near the top of the formula (position ${signals.dryingAlcoholPositions[0]}), indicating a volatile solvent base that can feel drying or tight on ${isDrySkin ? "dry" : "sensitive-leaning"} skin.`
    );
  }

  if (
    (isDrySkin || isSensitiveOrSoothing) &&
    signals.hasSulfates &&
    !profile.sensitivities.includes("sulfates")
  ) {
    concerns.push(
      "Uses anionic sulfate surfactants (SLS/SLES), which can strip surface lipids more aggressively than non-ionic glucoside cleansers on dry or sensitive skin."
    );
  }

  // 3. Routine Overlap & Compatibility Assessment (Saved Routine + Profile Toggles)
  const savedMorning = routineContext?.morningProducts ?? [];
  const savedEvening = routineContext?.eveningProducts ?? [];
  const allSavedRoutine = [...savedMorning, ...savedEvening];

  const routineHasAcid =
    profile.usesLeaveOnAcidInRoutine ||
    allSavedRoutine.some(
      (p) =>
        p.category !== "Cleanser" &&
        (p.attributes.includes("Contains exfoliating acid") ||
          EXFOLIATING_ACID_RE.test(p.inciDeclaration || ""))
    );

  const routineHasRetinoid =
    profile.usesRetinoidInRoutine ||
    allSavedRoutine.some(
      (p) =>
        p.attributes.includes("Contains retinoid") ||
        RETINOID_RE.test(p.inciDeclaration || "")
    );

  const hasMorningSpfInSavedRoutine = savedMorning.some((p) => p.category === "Sunscreen");

  if (isLeaveOn && signals.hasMeaningfulExfoliatingAcid && routineHasAcid) {
    concerns.push(
      "Routine overlap concern: You already include a leave-on exfoliating acid in your routine. Adding a second leave-on AHA/BHA increases over-exfoliation and barrier irritation risk unless alternated carefully."
    );
    routineCompatibilityNotes.push(
      "Avoid layering two leave-on exfoliating acids in the same routine session."
    );
  }

  if (isLeaveOn && signals.hasMeaningfulExfoliatingAcid && routineHasRetinoid) {
    routineCompatibilityNotes.push(
      "Compatibility pacing: Because your routine includes a retinoid, use this exfoliating acid on separate evenings (skin cycling) rather than layering them together."
    );
    if (isSensitiveOrSoothing) {
      concerns.push(
        "Combining a new leave-on exfoliating acid alongside an existing retinoid routine may overwhelm a sensitive-leaning barrier."
      );
    }
  }

  if (isLeaveOn && signals.hasRetinoid && routineHasRetinoid) {
    concerns.push(
      "Duplicate retinoid overlap: Your current routine already contains a retinoid. Stacking two retinoid products increases peeling and irritation without proven extra benefit."
    );
  }

  if (isLeaveOn && signals.hasRetinoid && routineHasAcid) {
    routineCompatibilityNotes.push(
      "Compatibility pacing: Introduce this retinoid on non-acid evenings rather than layering directly over leave-on AHA/BHA steps."
    );
  }

  if (signals.hasBenzoylPeroxide && routineHasRetinoid) {
    concerns.push(
      "Active interaction caution: Benzoyl peroxide can oxidize standard retinol/tretinoin and amplify dryness if applied in the same evening routine—separate AM vs. PM or alternate nights."
    );
  }

  if (
    (signals.hasAha || signals.hasRetinoid) &&
    profile.usesDailySunscreen === "no" &&
    !hasMorningSpfInSavedRoutine
  ) {
    concerns.push(
      "Sun-sensitivity caution: Alpha-hydroxy acids and retinoids require consistent daily broad-spectrum SPF 30+, and you noted you are not currently using daily sunscreen."
    );
  }

  // Category vs INCI sanity check for Sunscreens
  if (candidate.category === "Sunscreen" && !signals.hasUvFilter) {
    concerns.push(
      "Category mismatch: This product is categorised as a Sunscreen, but no standard mineral or organic UV filter was recognised in the supplied INCI list—verify the 'Active Ingredients' drug panel on the box."
    );
  }

  // 4. Evaluate Stated Marketing Claims Honestly
  const claimAssessments: ClaimAssessmentItem[] = candidate.statedClaims.map((claim) => {
    switch (claim) {
      case "fragrance-free": {
        if (signals.hasFragrance || signals.hasEssentialOil) {
          concerns.push(
            "Label claim conflict: Marked 'Fragrance-free / Unscented', yet the INCI list includes parfum, regulated aroma compounds, or volatile essential oils."
          );
          return {
            claim,
            label: PRODUCT_CLAIM_LABELS[claim],
            status: "contradicted_by_inci",
            explanation:
              "Contradicted by INCI: Aromatic fragrance compounds or volatile essential oils are listed in the ingredient declaration.",
          };
        }
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: "ingredient_supported",
          explanation:
            "Supported by supplied INCI: No parfum, masking aroma compounds, or volatile essential oils were detected in the provided list.",
        };
      }

      case "gentle-sensitive": {
        if (
          signals.hasFragrance ||
          signals.hasEssentialOil ||
          signals.hasHighPositionDryingAlcohol ||
          signals.hasSulfates
        ) {
          return {
            claim,
            label: PRODUCT_CLAIM_LABELS[claim],
            status: "contradicted_by_inci",
            explanation:
              "Questionable for sensitive skin: Formula includes common potential irritants (fragrance, essential oils, high-position denatured alcohol, or SLS/SLES).",
          };
        }
        const soothingPresent = matchedNotes.some((n) =>
          n.monograph.relatedThemes.includes("gentle-soothing")
        );
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: soothingPresent ? "ingredient_supported" : "unverifiable_from_inci",
          explanation: soothingPresent
            ? "Supported at ingredient level: Avoids fragrance/denatured alcohol and includes documented soothing/conditioning agents, though personal tolerance still requires patch testing."
            : "No common fragrance or sulfate triggers detected, though finished-formula gentleness depends on pH and surfactant/preservative concentrations.",
        };
      }

      case "hydrating-barrier": {
        const hydrators = matchedNotes.filter((n) =>
          n.monograph.relatedThemes.includes("hydration-support")
        );
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: hydrators.length > 0 ? "ingredient_supported" : "unverifiable_from_inci",
          explanation:
            hydrators.length > 0
              ? `Supported at ingredient level by ${hydrators
                  .slice(0, 3)
                  .map((h) => h.monograph.commonName)
                  .join(", ")}; exact moisture retention depends on total concentration and emulsion vehicle.`
              : "No indexed humectants or physiological barrier lipids matched in our local monograph catalogue.",
        };
      }

      case "oil-blemish-control": {
        const sebumMatches = matchedNotes.filter((n) =>
          n.monograph.relatedThemes.includes("sebum-pore-refinement")
        );
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: sebumMatches.length > 0 ? "ingredient_supported" : "unverifiable_from_inci",
          explanation:
            sebumMatches.length > 0
              ? `Supported at ingredient level by ${sebumMatches
                  .map((m) => m.monograph.commonName)
                  .join(", ")}; cosmetic formulas support surface shine/congestion care rather than treating clinical acne.`
              : "No indexed keratolytic BHA, niacinamide, azelaic acid, or zinc PCA actives were identified in the INCI list.",
        };
      }

      case "brightening-tone": {
        const toneMatches = matchedNotes.filter((n) =>
          n.monograph.relatedThemes.includes("tone-luminosity")
        );
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: toneMatches.length > 0 ? "ingredient_supported" : "unverifiable_from_inci",
          explanation:
            toneMatches.length > 0
              ? `Supported at ingredient level by ${toneMatches
                  .map((m) => m.monograph.commonName)
                  .join(", ")}; requires consistent UV protection and adequate active concentration.`
              : "No indexed antioxidant or tone-conditioning actives matched in our monograph reference.",
        };
      }

      case "smoothing-anti-ageing": {
        const smoothMatches = matchedNotes.filter(
          (n) =>
            n.monograph.relatedThemes.includes("well-ageing-support") ||
            n.monograph.relatedThemes.includes("surface-smoothing")
        );
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: smoothMatches.length > 0 ? "ingredient_supported" : "unverifiable_from_inci",
          explanation:
            smoothMatches.length > 0
              ? `Supported at ingredient level by ${smoothMatches
                  .slice(0, 3)
                  .map((m) => m.monograph.commonName)
                  .join(", ")}; line-softening outcomes depend on active percentage, stability, and multi-week use.`
              : "No indexed retinoids, AHAs, or plumping humectants matched in our monograph reference.",
        };
      }

      case "broad-spectrum-spf": {
        if (!signals.hasUvFilter) {
          return {
            claim,
            label: PRODUCT_CLAIM_LABELS[claim],
            status: "contradicted_by_inci",
            explanation:
              "No authorized mineral or organic UV filters were detected in the supplied INCI list (in the US/Canada, check whether UV filters are listed in a separate 'Drug Facts — Active Ingredients' box).",
          };
        }
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: "unverifiable_from_inci",
          explanation:
            "Authorized UV filter ingredients are present, but exact SPF number and broad-spectrum UVA-PF protection can only be substantiated by standardized in-vivo ISO/FDA testing of the finished product.",
        };
      }

      case "non-comedogenic-hypoallergenic":
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: "unverifiable_from_inci",
          explanation:
            "'Non-comedogenic' and 'hypoallergenic' have no standardized global regulatory test threshold and cannot be verified from an ingredient list—pore congestion and allergy depend on finished vehicle concentrations and individual biology.",
        };

      case "clinically-proven":
        return {
          claim,
          label: PRODUCT_CLAIM_LABELS[claim],
          status: "unverifiable_from_inci",
          explanation:
            "Clinical or dermatologist-tested claims refer to manufacturer testing on the finished product (often unpublished sample sizes or consumer perception surveys) and cannot be confirmed from INCI nomenclature alone.",
        };
    }
  });

  // 5. Budget Alignment Check (only when both verified product price and user budget exist)
  if (
    candidate.price &&
    Number.isFinite(candidate.price.amount) &&
    profile.budgetMaxAmount !== null &&
    Number.isFinite(profile.budgetMaxAmount) &&
    profile.budgetMaxAmount > 0 &&
    candidate.price.currency.toUpperCase() === profile.budgetCurrency.toUpperCase()
  ) {
    if (candidate.price.amount > profile.budgetMaxAmount) {
      concerns.push(
        `Budget consideration: Disclosed price (${candidate.price.currency} ${candidate.price.amount.toFixed(
          2
        )}) exceeds your target ceiling of ${profile.budgetCurrency} ${profile.budgetMaxAmount.toFixed(2)}.`
      );
    } else {
      supportingReasons.push(
        `Disclosed price (${candidate.price.currency} ${candidate.price.amount.toFixed(
          2
        )}) sits within your ${profile.budgetCurrency} ${profile.budgetMaxAmount.toFixed(2)} budget ceiling.`
      );
    }
  }

  // 6. Goal & Functional Role Alignment
  const nonSolventMonographs = matchedNotes.filter((n) => isFeaturedKeyMonograph(n.monograph));

  if (profile.goals.length > 0) {
    for (const goal of profile.goals) {
      const matchingForGoal = nonSolventMonographs.filter((n) =>
        n.monograph.relatedThemes.includes(goal)
      );
      if (matchingForGoal.length > 0) {
        supportingReasons.push(
          `Aligns with ${CARE_THEME_METADATA[goal].label}: includes ${matchingForGoal
            .map((m) => `${m.monograph.commonName} (INCI #${m.position})`)
            .join(", ")}.`
        );
      }
    }

    const anyGoalMatched = nonSolventMonographs.some((n) =>
      n.monograph.relatedThemes.some((t) => profile.goals.includes(t))
    );
    if (!anyGoalMatched && nonSolventMonographs.length > 0) {
      concerns.push(
        `Goal mismatch: While this formula contains documented cosmetic ingredients (${nonSolventMonographs
          .slice(0, 3)
          .map((m) => m.monograph.commonName)
          .join(", ")}), none directly target your selected focus goals (${profile.goals
          .map((g) => CARE_THEME_METADATA[g].shortLabel)
          .join(", ")}).`
      );
    }
  } else if (nonSolventMonographs.length > 0) {
    supportingReasons.push(
      `Contains ${nonSolventMonographs.length} documented functional ingredient${
        nonSolventMonographs.length === 1 ? "" : "s"
      } suited to ${candidate.category.toLowerCase()} care (${nonSolventMonographs
        .slice(0, 4)
        .map((m) => m.monograph.commonName)
        .join(", ")}).`
    );
  }

  if (!signals.hasFragrance && !signals.hasEssentialOil) {
    supportingReasons.push(
      "Free of declared parfum, regulated fragrance allergens, and volatile essential oils in the supplied INCI list."
    );
  }

  // Collect documented ingredient caution notes
  for (const item of matchedNotes) {
    if (item.monograph.cautionNote && !usageCautions.includes(item.monograph.cautionNote)) {
      usageCautions.push(item.monograph.cautionNote);
    }
  }
  usageCautions.push(
    "Patch test new skincare along the inner forearm or jawline for 24–48 hours before full-face application."
  );

  // If zero recognized monographs matched AND zero concerns were triggered, we lack enough ingredient coverage to call it a good fit
  const missingInformation: string[] = [
    "Exact active concentrations (%), free-acid pH, and packaging air/light stability are not disclosed on INCI labels.",
  ];
  if (candidate.price === null) {
    missingInformation.push("Verified retail price is not listed for this record.");
  }

  const confidenceLevel: DataConfidenceReport["level"] =
    candidate.userConfirmedLabel || candidate.provenance === "confirmed-packaging-label"
      ? parsed.length >= 5
        ? "high"
        : "moderate"
      : parsed.length >= 4
        ? "moderate"
        : "low";

  const confidenceLabel =
    confidenceLevel === "high"
      ? "High ingredient-list confidence (user-confirmed packaging INCI; concentrations remain undisclosed)"
      : confidenceLevel === "moderate"
        ? "Moderate confidence (complete INCI structure present, but verify regional batch label & undisclosed %)"
        : "Low confidence (limited ingredient coverage)";

  const dataConfidence: DataConfidenceReport = {
    level: confidenceLevel,
    label: confidenceLabel,
    provenanceLabel,
    parsedInciCount: parsed.length,
    matchedMonographCount: matchedNotes.length,
    unverifiedNotes,
  };

  // Build normalized SkincareProduct so user can immediately Compare or Add to My Routine
  const derivedAttributes = buildAttributesForCandidate(candidate, signals);
  const derivedThemes = Array.from(
    new Set<CareFocusTheme>(nonSolventMonographs.flatMap((n) => n.monograph.relatedThemes))
  );
  const normalizedProduct: SkincareProduct = {
    id: candidate.id || `check-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    sourceKind:
      candidate.provenance === "open-beauty-facts-crowd"
        ? "open-beauty-facts"
        : candidate.provenance === "reference-archetype"
          ? "reference-archetype"
          : "user-shelf",
    name: trimmedName,
    brand: trimmedBrand,
    category: candidate.category,
    price: candidate.price,
    sizeLabel: candidate.sizeLabel,
    imageUrl: null,
    barcode: candidate.barcode,
    sourceUrl: candidate.sourceUrl,
    inciDeclaration: cleanedInci,
    keyIngredients: nonSolventMonographs
      .slice(0, 6)
      .map((n) => n.monograph.commonName.split(" (")[0]),
    attributes: derivedAttributes,
    focusThemes: derivedThemes,
    surfacedReason:
      nonSolventMonographs.length > 0
        ? `Evaluated in Product Check (${parsed.length} INCI entries; ${nonSolventMonographs
            .slice(0, 3)
            .map((m) => m.monograph.commonName.split(" (")[0])
            .join(", ")}).`
        : `Evaluated in Product Check (${parsed.length} declared INCI entries).`,
  };

  if (nonSolventMonographs.length === 0 && concerns.length === 0 && !signals.hasUvFilter) {
    missingInformation.unshift(
      `None of the ${parsed.length} listed ingredients matched active functional monographs in Dew & Form's local reference library—only base solvents, thickeners, or unindexed botanical names were recognised.`
    );
    return {
      verdict: "not_enough_info",
      verdictTitle: "Not enough information",
      conclusion: `"${trimmedName}" lists ${parsed.length} INCI entries, but none matched documented active monographs in our reference index and no sensitivity flags were triggered—so Dew & Form cannot confirm how well it supports your specific skincare goals.`,
      supportingReasons,
      concerns,
      routineCompatibilityNotes,
      usageCautions,
      ingredientExplanations: matchedNotes,
      claimAssessments,
      missingInformation,
      dataConfidence: {
        ...dataConfidence,
        level: "low",
        label: "Limited monograph coverage for this specific base formula",
      },
      sourceReferences,
      finishedFormulaBoundaryNote,
      normalizedProduct,
    };
  }

  if (concerns.length > 0) {
    return {
      verdict: "some_concerns",
      verdictTitle: "Some concerns",
      conclusion: `"${trimmedName}" includes ${
        supportingReasons.length > 0
          ? "useful cosmetic ingredients, but raises"
          : "ingredients or attributes that raise"
      } ${concerns.length} specific consideration${
        concerns.length === 1 ? "" : "s"
      } for your profile or stated claims. Review the flagged points below before introducing it.`,
      supportingReasons,
      concerns,
      routineCompatibilityNotes,
      usageCautions,
      ingredientExplanations: matchedNotes,
      claimAssessments,
      missingInformation,
      dataConfidence,
      sourceReferences,
      finishedFormulaBoundaryNote,
      normalizedProduct,
    };
  }

  return {
    verdict: "good_potential_fit",
    verdictTitle: "Good potential fit",
    conclusion:
      profile.goals.length > 0
        ? `Based on its ${parsed.length} declared INCI entries, "${trimmedName}" aligns well with your stated focus on ${profile.goals
            .map((g) => CARE_THEME_METADATA[g].shortLabel.toLowerCase())
            .join(" & ")} without triggering your sensitivity or routine-conflict checks—subject to undisclosed concentrations and personal patch testing.`
        : `Based on its ${parsed.length} declared INCI entries, "${trimmedName}" contains well-documented ${candidate.category.toLowerCase()} ingredients with no fragrance, sulfate, or routine-stacking red flags detected—add your skin goals or sensitivities above to tailor this check further.`,
    supportingReasons,
    concerns: [],
    routineCompatibilityNotes,
    usageCautions,
    ingredientExplanations: matchedNotes,
    claimAssessments,
    missingInformation,
    dataConfidence,
    sourceReferences,
    finishedFormulaBoundaryNote,
    normalizedProduct,
  };
}

export interface ComparisonFitNote {
  productId: string;
  productName: string;
  goalMatchCount: number;
  sensitivityTriggers: string[];
  dataCompletenessLabel: string;
  contextualSummary: string;
}

/**
 * Generates non-absolute, user-contextual fit summaries for Product Comparison
 * without declaring any product universally superior.
 */
export function buildContextualComparisonFit(
  products: SkincareProduct[],
  profile: ProductCheckPersonalProfile
): ComparisonFitNote[] {
  return products.map((product) => {
    const cleaned = cleanRawInciText(product.inciDeclaration || "");
    const parsed = parseInciDeclaration(cleaned);
    const signals = detectFormulaSignals(
      cleaned,
      parsed.map((p) => p.rawLabel)
    );

    const activeGoals = profile.goals;
    const matchedGoals = product.focusThemes.filter((t) => activeGoals.includes(t));

    const triggers: string[] = [];
    if (signals.hasFragrance) triggers.push("Contains fragrance/aroma compounds");
    if (signals.hasEssentialOil) triggers.push("Contains volatile essential oils");
    if (signals.hasHighPositionDryingAlcohol) triggers.push("High-position Alcohol Denat.");
    if (signals.hasMeaningfulExfoliatingAcid) triggers.push("Contains exfoliating acid (AHA/BHA)");
    if (signals.hasRetinoid) triggers.push("Contains retinoid");
    if (signals.hasSulfates) triggers.push("Contains SLS/SLES surfactant");

    const monoCount = parsed.filter((p) => p.monograph !== null).length;
    const dataCompletenessLabel =
      parsed.length >= 5
        ? `${parsed.length} INCI entries (${monoCount} indexed monographs)${
            product.price ? " · Price verified" : " · Price unlisted"
          }`
        : parsed.length > 0
          ? `Partial (${parsed.length} INCI entries)`
          : "Missing INCI declaration";

    let contextualSummary: string;
    if (parsed.length < 3) {
      contextualSummary =
        "Insufficient INCI detail to compare ingredient suitability reliably.";
    } else if (activeGoals.length > 0 && matchedGoals.length > 0 && triggers.length === 0) {
      contextualSummary = `Stronger potential fit if you prioritise ${matchedGoals
        .map((g) => CARE_THEME_METADATA[g].shortLabel.toLowerCase())
        .join(" & ")} in a low-irritancy, fragrance-free base.`;
    } else if (activeGoals.length > 0 && matchedGoals.length > 0 && triggers.length > 0) {
      contextualSummary = `Addresses ${matchedGoals
        .map((g) => CARE_THEME_METADATA[g].shortLabel.toLowerCase())
        .join(" & ")}, though note ${triggers[0].toLowerCase()} depending on your skin tolerance.`;
    } else if (triggers.length === 0) {
      contextualSummary = `Gentle baseline option (${product.category.toLowerCase()}) without fragrance or harsh active triggers, though less targeted to your current focus filter.`;
    } else {
      contextualSummary = `Includes ${triggers.join(", ").toLowerCase()}—better suited to tolerant routines seeking those specific traits.`;
    }

    return {
      productId: product.id,
      productName: product.name,
      goalMatchCount: matchedGoals.length,
      sensitivityTriggers: triggers,
      dataCompletenessLabel,
      contextualSummary,
    };
  });
}

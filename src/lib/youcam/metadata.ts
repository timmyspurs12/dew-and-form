import type { CanonicalConcernKey, ConcernGroup } from "./types";

export type CareFocusTheme =
  | "hydration-support"
  | "gentle-soothing"
  | "sebum-pore-refinement"
  | "surface-smoothing"
  | "tone-luminosity"
  | "well-ageing-support";

export const ALL_CARE_FOCUS_THEMES: CareFocusTheme[] = [
  "hydration-support",
  "gentle-soothing",
  "sebum-pore-refinement",
  "surface-smoothing",
  "tone-luminosity",
  "well-ageing-support",
];

export function isValidCareFocusTheme(val: string): val is CareFocusTheme {
  return (ALL_CARE_FOCUS_THEMES as string[]).includes(val);
}

export interface ConcernEditorialMeta {
  key: CanonicalConcernKey;
  label: string;
  group: ConcernGroup;
  groupLabel: string;
  sdAction: string;
  hdAction: string;
  whatItRepresents: string;
  opticalNote: string;
  relatedThemes: CareFocusTheme[];
}

export const CONCERN_GROUP_LABELS: Record<ConcernGroup, { title: string; subtitle: string }> = {
  hydration_balance: {
    title: "Moisture & Sebum Balance",
    subtitle: "Optical surface indicators associated with hydration and surface shine.",
  },
  surface_texture: {
    title: "Surface Texture & Pores",
    subtitle: "Micro-relief smoothness, visible pore appearance, and localized blemishes.",
  },
  tone_clarity: {
    title: "Tone Evenness & Luminosity",
    subtitle: "Light reflection, visible redness, and localized pigment variation.",
  },
  lines_contour: {
    title: "Expression Lines & Eye Contour",
    subtitle: "Fine surface creases, firmness cues, and under-eye shadow or puffiness.",
  },
};

export interface CareThemeEditorialMeta {
  id: CareFocusTheme;
  label: string;
  shortLabel: string;
  summary: string;
  commonlyExploredIngredients: string[];
  /** Indexed Open Beauty Facts v2 ingredient tags for live theme-matched discovery */
  obfIngredientTags: string[];
  morningNote: string;
  eveningNote: string;
  cadence: string;
  layeringNote: string;
}

export const CARE_THEME_METADATA: Record<CareFocusTheme, CareThemeEditorialMeta> = {
  "hydration-support": {
    id: "hydration-support",
    label: "Hydration & Water Retention",
    shortLabel: "Hydration",
    summary: "Water-binding humectants paired with barrier lipids to comfort tight or dry-feeling zones.",
    commonlyExploredIngredients: [
      "Glycerin",
      "Sodium Hyaluronate",
      "Panthenol",
      "Ceramide NP",
      "Squalane",
    ],
    obfIngredientTags: ["en:sodium-hyaluronate", "en:panthenol"],
    morningNote: "Apply a humectant serum onto slightly damp skin before sealing with moisturiser and SPF.",
    eveningNote: "Layer a replenishing ceramide or squalane cream as your final step to limit overnight water loss.",
    cadence: "Suitable for daily morning and evening use.",
    layeringNote:
      "Humectants (glycerin, hyaluronates, panthenol) pair comfortably alongside virtually all active families.",
  },
  "gentle-soothing": {
    id: "gentle-soothing",
    label: "Calm & Redness-Conscious Care",
    shortLabel: "Calm & Soothing",
    summary: "Low-irritancy, fragrance-free formulas with soothing botanicals and barrier-supporting lipids.",
    commonlyExploredIngredients: [
      "Centella Asiatica Extract",
      "Panthenol",
      "Allantoin",
      "Bisabolol",
      "Azelaic Acid",
    ],
    obfIngredientTags: ["en:panthenol", "en:allantoin"],
    morningNote: "Keep morning cleansing ultra-mild (or rinse with lukewarm water) and choose fragrance-free emulsions.",
    eveningNote: "Focus on soothing conditioning steps (Centella, panthenol, allantoin, or gentle azelaic acid).",
    cadence: "Soothing hydrators daily; introduce azelaic acid 2–3 evenings weekly at first.",
    layeringNote:
      "When skin feels reactive, pause high-strength exfoliating acids, essential oils, and denatured alcohol.",
  },
  "sebum-pore-refinement": {
    id: "sebum-pore-refinement",
    label: "Oil Balance & Pore Appearance",
    shortLabel: "Oil & Pores",
    summary: "Breathable gel-emulsion textures with sebum-balancing humectants or oil-soluble BHA.",
    commonlyExploredIngredients: ["Niacinamide", "Salicylic Acid", "Zinc PCA", "Azelaic Acid"],
    obfIngredientTags: ["en:niacinamide", "en:salicylic-acid"],
    morningNote: "Use a lightweight niacinamide or zinc PCA serum beneath a non-heavy gel moisturiser and fluid SPF.",
    eveningNote: "Cleanse thoroughly to lift sunscreen and excess sebum; use leave-on salicylic acid on measured evenings.",
    cadence: "Niacinamide daily; leave-on salicylic acid (BHA) 2–3 evenings per week.",
    layeringNote:
      "Avoid harsh, stripping cleansers—over-degreasing the T-zone can leave skin tight while surface shine rebounds.",
  },
  "surface-smoothing": {
    id: "surface-smoothing",
    label: "Texture & Surface Renewal",
    shortLabel: "Texture Renewal",
    summary: "Measured keratolytic acids, gentle retinoids, or hydrating smoothers paced to your tolerance.",
    commonlyExploredIngredients: ["Lactic Acid", "Salicylic Acid", "Niacinamide", "Retinol"],
    obfIngredientTags: ["en:lactic-acid", "en:salicylic-acid"],
    morningNote: "Prioritise hydration and daily broad-spectrum SPF 30+—renewal actives increase sun sensitivity.",
    eveningNote: "Apply a single leave-on keratolytic acid (AHA/BHA) on dedicated renewal nights, followed by plain moisturiser.",
    cadence: "Begin 1–2 evenings per week and increase gradually only if skin stays comfortable.",
    layeringNote:
      "Do not stack multiple exfoliating acids (AHA + BHA) or combine leave-on acids with retinoids in the same evening.",
  },
  "tone-luminosity": {
    id: "tone-luminosity",
    label: "Tone Clarity & Radiance",
    shortLabel: "Tone & Radiance",
    summary: "Antioxidants and tone-evening conditioning steps anchored by consistent daily UV protection.",
    commonlyExploredIngredients: [
      "Ascorbic Acid",
      "Niacinamide",
      "Tranexamic Acid",
      "Azelaic Acid",
      "Tocopherol",
    ],
    obfIngredientTags: ["en:ascorbic-acid", "en:niacinamide"],
    morningNote: "Apply an antioxidant vitamin C or niacinamide serum in the morning before broad-spectrum sunscreen.",
    eveningNote: "Explore gentle tone-conditioning steps (niacinamide, tranexamic acid, or azelaic acid) beneath moisturiser.",
    cadence: "Consistent daily sunscreen is essential—unprotected UV exposure counteracts brightening routines.",
    layeringNote:
      "Low-pH pure L-ascorbic acid serums can tingle if layered directly with exfoliating acids; separate AM (antioxidants) from PM (acids/retinoids).",
  },
  "well-ageing-support": {
    id: "well-ageing-support",
    label: "Line Softening & Elasticity",
    shortLabel: "Lines & Elasticity",
    summary: "Plumping humectants and barrier lipids paired with gradual evening retinoids and daily SPF.",
    commonlyExploredIngredients: [
      "Retinol",
      "Glycerin",
      "Sodium Hyaluronate",
      "Ceramide NP",
      "Tocopherol",
    ],
    obfIngredientTags: ["en:retinol", "en:tocopherol"],
    morningNote: "Plump fine dehydration lines with glycerin/hyaluronate and protect collagen cues with daily SPF 30+.",
    eveningNote: "Apply a pea-sized cosmetic retinol on dry skin (or buffered over a thin humectant layer), sealed with lipid cream.",
    cadence: "Introduce retinoids 2 evenings per week for the first 3–4 weeks before increasing frequency.",
    layeringNote:
      "Avoid retinoids during pregnancy or breastfeeding without medical advice, and skip exfoliating acids on retinoid nights.",
  },
};

export interface RoutineStepGuide {
  stepNumber: string;
  stepTitle: string;
  targetCategory:
    | "Cleanser"
    | "Toner & Essence"
    | "Hydrating Serum"
    | "Targeted Treatment"
    | "Moisturiser & Barrier Cream"
    | "Sunscreen";
  guidance: string;
  suggestedInci: string[];
  cadenceBadge: string;
}

export interface ComposedRoutineBlueprint {
  morningSteps: RoutineStepGuide[];
  eveningSteps: RoutineStepGuide[];
  layeringCautions: string[];
}

/**
 * Synthesizes selected care focus themes into a calm, non-medical AM / PM routine structure
 * with conflict-aware layering notes (e.g., alternating nights when both acids and retinoids are active).
 */
export function composeRoutineBlueprint(
  selectedThemes: CareFocusTheme[]
): ComposedRoutineBlueprint {
  const hasHydration = selectedThemes.includes("hydration-support");
  const hasSoothing = selectedThemes.includes("gentle-soothing");
  const hasSebum = selectedThemes.includes("sebum-pore-refinement");
  const hasTexture = selectedThemes.includes("surface-smoothing");
  const hasTone = selectedThemes.includes("tone-luminosity");
  const hasWellAgeing = selectedThemes.includes("well-ageing-support");

  const usesAcids = hasSebum || hasTexture;
  const hasAcidRetinoidConflict = usesAcids && hasWellAgeing;

  // AM Step 01: Cleanse
  const amCleanseGuidance = hasSoothing
    ? "Rinse with lukewarm water or use a fragrance-free non-ionic glucoside wash for 20 seconds so surface lipids stay intact."
    : hasSebum
      ? "Use a mild gel cleanser to lift overnight T-zone sebum without sulfate tightness."
      : "Cleanse gently with a low-foaming glycerin or glucoside wash—skin should feel comfortable, never squeaky.";

  // AM Step 02: Morning Serum / Hydrator
  const amTreatInci = Array.from(
    new Set([
      ...(hasTone ? ["Ascorbic Acid", "Niacinamide"] : []),
      ...(hasSebum ? ["Niacinamide", "Zinc PCA"] : []),
      ...(hasSoothing ? ["Centella Asiatica Extract", "Panthenol"] : []),
      ...(hasHydration || hasWellAgeing ? ["Glycerin", "Sodium Hyaluronate"] : []),
    ])
  ).slice(0, 4);

  const amTreatGuidance = hasTone
    ? "Apply an antioxidant vitamin C or niacinamide serum to support even luminosity beneath sunscreen."
    : hasSebum
      ? "Press a lightweight niacinamide or zinc PCA humectant serum across shine-prone zones."
      : hasSoothing
        ? "Apply a calming panthenol and Centella serum onto damp skin to cushion redness-prone areas."
        : "Apply a water-binding humectant serum (glycerin, sodium hyaluronate, panthenol) onto slightly damp skin.";

  // AM Step 03: Moisturiser
  const amMoisturiseGuidance =
    hasSebum && !hasHydration
      ? "Choose a breathable gel-cream or light emulsion so the T-zone feels balanced under sunscreen."
      : "Seal hydration with a fragrance-free barrier cream containing glycerin, squalane, or ceramides.";

  // AM Step 04: Broad-Spectrum Sunscreen
  const amSpfGuidance =
    usesAcids || hasWellAgeing || hasTone
      ? "Essential final morning step: apply generous broad-spectrum SPF 30+ (especially important alongside acids, retinoids, or tone routines)."
      : "Finish every morning with broad-spectrum SPF 30+ to protect the skin barrier from daily UV exposure.";

  // PM Step 02: Evening Targeted Step
  let pmTreatGuidance =
    "Replenish with a soothing humectant or barrier-conditioning serum before your night cream.";
  let pmTreatCadence = "Nightly";
  let pmTreatCategory: RoutineStepGuide["targetCategory"] = "Hydrating Serum";
  let pmTreatInci: string[] = ["Panthenol", "Glycerin", "Centella Asiatica Extract"];

  if (hasAcidRetinoidConflict) {
    pmTreatGuidance =
      "Alternate evenings (skin cycling) rather than layering together: use a gentle exfoliating acid (BHA/AHA) 1–2 nights weekly, cosmetic retinol 2 nights weekly, and plain soothing hydration on recovery nights.";
    pmTreatCadence = "Alternate nights · Never stack";
    pmTreatCategory = "Targeted Treatment";
    pmTreatInci = ["Salicylic Acid", "Lactic Acid", "Retinol", "Panthenol"];
  } else if (hasWellAgeing) {
    pmTreatGuidance =
      "Apply a pea-sized cosmetic retinol emulsion onto dry skin (or buffered over a light humectant layer) 2–3 evenings per week, using plain hydration on off-nights.";
    pmTreatCadence = "2–3 evenings / week";
    pmTreatCategory = "Targeted Treatment";
    pmTreatInci = ["Retinol", "Sodium Hyaluronate", "Tocopherol"];
  } else if (hasTexture) {
    pmTreatGuidance =
      "Use a single measured leave-on lactic acid (AHA) or salicylic acid (BHA) treatment 1–3 evenings per week; stick to calm hydration on the remaining nights.";
    pmTreatCadence = "1–3 evenings / week";
    pmTreatCategory = "Targeted Treatment";
    pmTreatInci = ["Lactic Acid", "Salicylic Acid", "Niacinamide"];
  } else if (hasSebum) {
    pmTreatGuidance =
      "Apply niacinamide or azelaic acid most evenings, reserving leave-on salicylic acid (BHA) for 2–3 nights a week on congested zones.";
    pmTreatCadence = "Paced 2–3x / week for BHA";
    pmTreatCategory = "Targeted Treatment";
    pmTreatInci = ["Niacinamide", "Salicylic Acid", "Azelaic Acid", "Zinc PCA"];
  } else if (hasSoothing) {
    pmTreatGuidance =
      "Focus on fragrance-free soothing care (Centella, panthenol, allantoin, bisabolol, or gradually introduced cosmetic azelaic acid).";
    pmTreatCadence = "Nightly comfort";
    pmTreatCategory = "Hydrating Serum";
    pmTreatInci = ["Centella Asiatica Extract", "Panthenol", "Allantoin", "Azelaic Acid"];
  } else if (hasTone) {
    pmTreatGuidance =
      "Use a gentle tone-conditioning serum (niacinamide, tranexamic acid, or azelaic acid) beneath your evening moisturiser.";
    pmTreatCadence = "Most evenings";
    pmTreatCategory = "Targeted Treatment";
    pmTreatInci = ["Niacinamide", "Tranexamic Acid", "Azelaic Acid"];
  }

  const cautions: string[] = [];
  if (hasAcidRetinoidConflict) {
    cautions.push(
      "Separate exfoliating acids (salicylic, lactic) and retinoids onto different evenings to reduce stinging and barrier dryness."
    );
  }
  for (const t of selectedThemes) {
    const note = CARE_THEME_METADATA[t].layeringNote;
    if (!cautions.includes(note)) {
      cautions.push(note);
    }
  }
  cautions.push(
    "Introduce only one new product every 10–14 days and patch test along the jawline or inner forearm first."
  );

  return {
    morningSteps: [
      {
        stepNumber: "01",
        stepTitle: "Gentle Cleanse",
        targetCategory: "Cleanser",
        guidance: amCleanseGuidance,
        suggestedInci: ["Coco-Glucoside", "Glycerin", "Panthenol"],
        cadenceBadge: "Daily AM",
      },
      {
        stepNumber: "02",
        stepTitle: "Hydrate & Antioxidant Prep",
        targetCategory: hasTone ? "Targeted Treatment" : "Hydrating Serum",
        guidance: amTreatGuidance,
        suggestedInci: amTreatInci.length > 0 ? amTreatInci : ["Glycerin", "Panthenol"],
        cadenceBadge: "Daily AM",
      },
      {
        stepNumber: "03",
        stepTitle: "Barrier Moisturiser",
        targetCategory: "Moisturiser & Barrier Cream",
        guidance: amMoisturiseGuidance,
        suggestedInci: hasSebum
          ? ["Glycerin", "Niacinamide", "Dimethicone"]
          : ["Ceramide NP", "Squalane", "Glycerin"],
        cadenceBadge: "Daily AM",
      },
      {
        stepNumber: "04",
        stepTitle: "Broad-Spectrum UV Protection",
        targetCategory: "Sunscreen",
        guidance: amSpfGuidance,
        suggestedInci: ["Tocopherol", "Glycerin"],
        cadenceBadge: "Essential AM",
      },
    ],
    eveningSteps: [
      {
        stepNumber: "01",
        stepTitle: "Thorough Evening Cleanse",
        targetCategory: "Cleanser",
        guidance:
          "Massage a gentle cleanser for 30 seconds to dissolve daily sunscreen, urban particulates, and surface sebum, then rinse with lukewarm water.",
        suggestedInci: ["Coco-Glucoside", "Glycerin", "Allantoin"],
        cadenceBadge: "Daily PM",
      },
      {
        stepNumber: "02",
        stepTitle: "Targeted Evening Care",
        targetCategory: pmTreatCategory,
        guidance: pmTreatGuidance,
        suggestedInci: pmTreatInci,
        cadenceBadge: pmTreatCadence,
      },
      {
        stepNumber: "03",
        stepTitle: "Restorative Lipid Seal",
        targetCategory: "Moisturiser & Barrier Cream",
        guidance:
          "Finish with a comforting leave-on moisturiser rich in humectants and physiological lipids to support overnight barrier recovery.",
        suggestedInci: ["Ceramide NP", "Cholesterol", "Squalane", "Panthenol"],
        cadenceBadge: "Daily PM",
      },
    ],
    layeringCautions: cautions.slice(0, 4),
  };
}

export const CONCERN_METADATA: Record<CanonicalConcernKey, ConcernEditorialMeta> = {
  moisture: {
    key: "moisture",
    label: "Moisture Cues",
    group: "hydration_balance",
    groupLabel: CONCERN_GROUP_LABELS.hydration_balance.title,
    sdAction: "moisture",
    hdAction: "hd_moisture",
    whatItRepresents:
      "Estimates visible surface cues associated with skin hydration on YouCam's 1–100 condition index, where higher numbers correspond to smoother, better-hydrated visual appearance.",
    opticalNote:
      "Optical analysis cannot measure transepidermal water loss directly like a physical corneometer; ambient lighting and recent moisturizer use influence this reading.",
    relatedThemes: ["hydration-support"],
  },
  oiliness: {
    key: "oiliness",
    label: "Surface Shine & Oiliness",
    group: "hydration_balance",
    groupLabel: CONCERN_GROUP_LABELS.hydration_balance.title,
    sdAction: "oiliness",
    hdAction: "hd_oiliness",
    whatItRepresents:
      "Evaluates specular shine and sebum-associated reflections across facial zones on YouCam's 1–100 index (higher indicates more balanced, less excess shine).",
    opticalNote:
      "Direct directional light, humidity, or dewy skincare finishes can amplify shine independent of baseline sebum output.",
    relatedThemes: ["sebum-pore-refinement"],
  },
  redness: {
    key: "redness",
    label: "Visible Redness",
    group: "tone_clarity",
    groupLabel: CONCERN_GROUP_LABELS.tone_clarity.title,
    sdAction: "redness",
    hdAction: "hd_redness",
    whatItRepresents:
      "Detects localized erythema-like colour contrast relative to surrounding skin tone on a 1–100 index (higher indicates calmer, more uniform tone).",
    opticalNote:
      "Warm indoor bulbs, recent cleansing, temperature changes, or camera white balance can shift visible redness. Not a diagnostic assessment for rosacea or dermatitis.",
    relatedThemes: ["gentle-soothing"],
  },
  pore: {
    key: "pore",
    label: "Pore Visibility",
    group: "surface_texture",
    groupLabel: CONCERN_GROUP_LABELS.surface_texture.title,
    sdAction: "pore",
    hdAction: "hd_pore",
    whatItRepresents:
      "Measures the optical prominence of follicular openings—broken down across forehead, nose, and cheeks in HD tasks—on a 1–100 index (higher indicates less prominent pores).",
    opticalNote:
      "Visible pores are a normal anatomical structure of skin; high-resolution close-up lenses naturally capture more pore detail.",
    relatedThemes: ["sebum-pore-refinement", "surface-smoothing"],
  },
  texture: {
    key: "texture",
    label: "Surface Texture",
    group: "surface_texture",
    groupLabel: CONCERN_GROUP_LABELS.surface_texture.title,
    sdAction: "texture",
    hdAction: "hd_texture",
    whatItRepresents:
      "Assesses overall micro-shadowing and surface smoothness across the complexion on YouCam's 1–100 index (higher indicates smoother visual texture).",
    opticalNote:
      "Side-angled window lighting casts stronger micro-shadows across normal skin grain than diffused frontal light.",
    relatedThemes: ["surface-smoothing", "hydration-support"],
  },
  acne: {
    key: "acne",
    label: "Blemish & Spot Presence",
    group: "surface_texture",
    groupLabel: CONCERN_GROUP_LABELS.surface_texture.title,
    sdAction: "acne",
    hdAction: "hd_acne",
    whatItRepresents:
      "Identifies localized raised or pigmented blemish features on a 1–100 index (higher indicates fewer detected blemish spots).",
    opticalNote:
      "Computer vision cannot distinguish active acne vulgaris from transient irritation, post-blemish marks, or benign moles.",
    relatedThemes: ["sebum-pore-refinement", "gentle-soothing"],
  },
  radiance: {
    key: "radiance",
    label: "Radiance & Brightness",
    group: "tone_clarity",
    groupLabel: CONCERN_GROUP_LABELS.tone_clarity.title,
    sdAction: "radiance",
    hdAction: "hd_radiance",
    whatItRepresents:
      "Evaluates even light reflectance and overall luminosity on YouCam's 1–100 index (higher indicates brighter, more luminous light reflection).",
    opticalNote:
      "Strongly influenced by exposure evenness and background illumination during capture.",
    relatedThemes: ["tone-luminosity", "hydration-support"],
  },
  age_spot: {
    key: "age_spot",
    label: "Pigment & Dark Spots",
    group: "tone_clarity",
    groupLabel: CONCERN_GROUP_LABELS.tone_clarity.title,
    sdAction: "age_spot",
    hdAction: "hd_age_spot",
    whatItRepresents:
      "Detects localized hyperpigmented macules, sun spots, or uneven tone clusters on a 1–100 index (higher indicates fewer detected spots).",
    opticalNote:
      "Freckles, moles, and post-inflammatory marks appear similarly in photographs; any changing pigmented lesion should always be checked in person by a dermatologist.",
    relatedThemes: ["tone-luminosity"],
  },
  wrinkle: {
    key: "wrinkle",
    label: "Fine Lines & Creases",
    group: "lines_contour",
    groupLabel: CONCERN_GROUP_LABELS.lines_contour.title,
    sdAction: "wrinkle",
    hdAction: "hd_wrinkle",
    whatItRepresents:
      "Evaluates expression lines and creases—across forehead, glabellar, crow's feet, periocular, nasolabial, and marionette zones in HD mode—on a 1–100 index (higher indicates fewer visible lines).",
    opticalNote:
      "Facial expression (even a slight squint or smile) and temporary surface dehydration markedly change line visibility.",
    relatedThemes: ["well-ageing-support", "hydration-support"],
  },
  firmness: {
    key: "firmness",
    label: "Visual Firmness Cues",
    group: "lines_contour",
    groupLabel: CONCERN_GROUP_LABELS.lines_contour.title,
    sdAction: "firmness",
    hdAction: "hd_firmness",
    whatItRepresents:
      "Estimates contour definition and visual elasticity cues from facial geometry and shadowing on a 1–100 index (higher indicates stronger visual contour).",
    opticalNote:
      "A 2D image cannot physically test skin elasticity; camera pitch (holding the phone low vs. eye level) alters contour readings.",
    relatedThemes: ["well-ageing-support"],
  },
  dark_circle: {
    key: "dark_circle",
    label: "Under-Eye Shadow",
    group: "lines_contour",
    groupLabel: CONCERN_GROUP_LABELS.lines_contour.title,
    sdAction: "dark_circle_v2",
    hdAction: "hd_dark_circle",
    whatItRepresents:
      "Analyzes colour contrast and shadow intensity beneath the lower orbital area on a 1–100 index (higher indicates lighter under-eye shadow).",
    opticalNote:
      "Overhead lighting casts natural orbital shadows regardless of pigment or sleep.",
    relatedThemes: ["hydration-support", "tone-luminosity"],
  },
  eye_bag: {
    key: "eye_bag",
    label: "Under-Eye Puffiness",
    group: "lines_contour",
    groupLabel: CONCERN_GROUP_LABELS.lines_contour.title,
    sdAction: "eye_bag",
    hdAction: "hd_eye_bag",
    whatItRepresents:
      "Detects visible fullness or contour Transition beneath the lower lash line on a 1–100 index (higher indicates less pronounced puffiness).",
    opticalNote:
      "Morning fluid retention and overhead shadows commonly affect under-eye contour estimates.",
    relatedThemes: ["hydration-support"],
  },
  tear_trough: {
    key: "tear_trough",
    label: "Tear Trough Contour",
    group: "lines_contour",
    groupLabel: CONCERN_GROUP_LABELS.lines_contour.title,
    sdAction: "tear_trough",
    hdAction: "hd_tear_trough",
    whatItRepresents:
      "Evaluates the natural anatomical groove running from the inner corner of the eye toward the mid-cheek on a 1–100 index.",
    opticalNote:
      "Tear trough depth is primarily a structural facial feature rather than a topical skincare concern.",
    relatedThemes: ["hydration-support"],
  },
  droopy_upper_eyelid: {
    key: "droopy_upper_eyelid",
    label: "Upper Eyelid Fold",
    group: "lines_contour",
    groupLabel: CONCERN_GROUP_LABELS.lines_contour.title,
    sdAction: "droopy_upper_eyelid",
    hdAction: "hd_droopy_upper_eyelid",
    whatItRepresents:
      "Measures upper eyelid crease and fold geometry on YouCam's 1–100 optical scale.",
    opticalNote:
      "Natural eyelid anatomy varies widely across individuals and gaze angles; included only when returned by the API.",
    relatedThemes: ["well-ageing-support"],
  },
  droopy_lower_eyelid: {
    key: "droopy_lower_eyelid",
    label: "Lower Eyelid Contour",
    group: "lines_contour",
    groupLabel: CONCERN_GROUP_LABELS.lines_contour.title,
    sdAction: "droopy_lower_eyelid",
    hdAction: "hd_droopy_lower_eyelid",
    whatItRepresents:
      "Measures lower eyelid margin contour on YouCam's 1–100 optical scale.",
    opticalNote:
      "Reflects camera gaze angle and natural eye shape rather than a skin health condition.",
    relatedThemes: ["hydration-support"],
  },
};

export const ALL_CANONICAL_CONCERNS: CanonicalConcernKey[] = [
  "moisture",
  "oiliness",
  "redness",
  "pore",
  "texture",
  "acne",
  "radiance",
  "age_spot",
  "wrinkle",
  "firmness",
  "dark_circle",
  "eye_bag",
  "tear_trough",
  "droopy_upper_eyelid",
  "droopy_lower_eyelid",
];

export const REGION_LABELS: Record<string, string> = {
  whole: "Whole Face",
  t_zone: "T-Zone (Forehead & Nose)",
  u_zone: "U-Zone (Cheeks & Chin)",
  forehead: "Forehead",
  nose: "Nose",
  cheek: "Cheeks",
  glabellar: "Glabellar (Between Brows)",
  crowfeet: "Crow's Feet",
  periocular: "Under-Eye & Periocular",
  nasolabial: "Nasolabial Folds",
  marionette: "Marionette Lines",
};

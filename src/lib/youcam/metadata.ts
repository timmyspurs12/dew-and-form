import type { CanonicalConcernKey, ConcernGroup } from "./types";

export type CareFocusTheme =
  | "hydration-support"
  | "gentle-soothing"
  | "sebum-pore-refinement"
  | "surface-smoothing"
  | "tone-luminosity"
  | "well-ageing-support";

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

export const CARE_THEME_METADATA: Record<
  CareFocusTheme,
  {
    id: CareFocusTheme;
    label: string;
    summary: string;
    commonlyExploredIngredients: string[];
  }
> = {
  "hydration-support": {
    id: "hydration-support",
    label: "Hydration & Water Retention",
    summary: "Humectants and barrier-supporting lipids commonly used to comfort dry-feeling skin.",
    commonlyExploredIngredients: ["Glycerin", "Sodium Hyaluronate", "Panthenol", "Ceramide NP", "Squalane"],
  },
  "gentle-soothing": {
    id: "gentle-soothing",
    label: "Calm & Redness-Conscious Care",
    summary: "Low-irritancy, fragrance-free formulas with skin-soothing botanicals and barrier lipids.",
    commonlyExploredIngredients: ["Centella Asiatica Extract", "Panthenol", "Allantoin", "Bisabolol", "Azelaic Acid"],
  },
  "sebum-pore-refinement": {
    id: "sebum-pore-refinement",
    label: "Oil Balance & Pore Appearance",
    summary: "Lightweight, non-heavy textures and oil-soluble exfoliants or sebum-balancing humectants.",
    commonlyExploredIngredients: ["Niacinamide", "Salicylic Acid", "Zinc PCA", "Azelaic Acid"],
  },
  "surface-smoothing": {
    id: "surface-smoothing",
    label: "Texture & Surface Renewal",
    summary: "Measured keratolytic acids, gentle retinoids, or hydrating smoothers depending on tolerance.",
    commonlyExploredIngredients: ["Lactic Acid", "Salicylic Acid", "Niacinamide", "Retinol"],
  },
  "tone-luminosity": {
    id: "tone-luminosity",
    label: "Tone Clarity & Radiance",
    summary: "Antioxidants and tone-evening actives best paired with consistent daily broad-spectrum sunscreen.",
    commonlyExploredIngredients: ["Ascorbic Acid", "Niacinamide", "Tranexamic Acid", "Azelaic Acid", "Tocopherol"],
  },
  "well-ageing-support": {
    id: "well-ageing-support",
    label: "Line Softening & Elasticity",
    summary: "Hydrating plumping humectants alongside retinoids or antioxidants introduced gradually.",
    commonlyExploredIngredients: ["Retinol", "Glycerin", "Sodium Hyaluronate", "Ceramide NP", "Tocopherol"],
  },
};

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

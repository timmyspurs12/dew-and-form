import { normalizeYouCamJsonOutput } from "@/lib/youcam/normalizer";
import { HD_DEFAULT_ACTIONS } from "@/lib/youcam/validation";
import type { NormalizedSkinAnalysisResult, YouCamJsonOutputItem } from "@/lib/youcam/types";

function createIllustrativeZoneSvgDataUrl(zone: "t_zone" | "cheeks" | "forehead" | "under_eye" | "full"): string {
  const shapes: Record<typeof zone, string> = {
    t_zone: `
      <ellipse cx="200" cy="135" rx="78" ry="34" fill="rgba(168,110,90,0.34)" stroke="rgba(168,110,90,0.85)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <rect x="180" y="165" width="40" height="88" rx="18" fill="rgba(168,110,90,0.34)" stroke="rgba(168,110,90,0.85)" stroke-width="1.5" stroke-dasharray="4 3"/>
    `,
    cheeks: `
      <ellipse cx="132" cy="238" rx="42" ry="52" fill="rgba(83,99,77,0.32)" stroke="rgba(38,56,47,0.85)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <ellipse cx="268" cy="238" rx="42" ry="52" fill="rgba(83,99,77,0.32)" stroke="rgba(38,56,47,0.85)" stroke-width="1.5" stroke-dasharray="4 3"/>
    `,
    forehead: `
      <ellipse cx="200" cy="132" rx="84" ry="36" fill="rgba(83,99,77,0.32)" stroke="rgba(38,56,47,0.85)" stroke-width="1.5" stroke-dasharray="4 3"/>
    `,
    under_eye: `
      <path d="M122 198 Q154 222 182 202" fill="none" stroke="rgba(168,110,90,0.9)" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
      <path d="M218 202 Q246 222 278 198" fill="none" stroke="rgba(168,110,90,0.9)" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
    `,
    full: `
      <ellipse cx="200" cy="220" rx="108" ry="142" fill="rgba(83,99,77,0.16)" stroke="rgba(38,56,47,0.65)" stroke-width="1.5" stroke-dasharray="5 4"/>
    `,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480">
    ${shapes[zone]}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Documented HD payload derived directly from Perfect Corp's AI Skin Analysis
 * reference schema (`score_info.json` / `format: "json"` sample values).
 * Kept strictly isolated as a development fixture — never presented as a live scan.
 */
const DOCUMENTED_HD_SAMPLE_OUTPUT: YouCamJsonOutputItem[] = [
  {
    type: "hd_skin_type",
    region: "whole",
    skin_type: "Combination",
    mask_urls: [createIllustrativeZoneSvgDataUrl("full")],
  },
  {
    type: "hd_skin_type",
    region: "t_zone",
    skin_type: "Oily",
    mask_urls: [createIllustrativeZoneSvgDataUrl("t_zone")],
  },
  {
    type: "hd_skin_type",
    region: "u_zone",
    skin_type: "Dry & Redness",
    mask_urls: [createIllustrativeZoneSvgDataUrl("cheeks")],
  },
  {
    type: "hd_moisture",
    region: "whole",
    raw_score: 48.7,
    ui_score: 70,
    mask_urls: [createIllustrativeZoneSvgDataUrl("cheeks")],
  },
  {
    type: "hd_oiliness",
    region: "whole",
    raw_score: 60.7,
    ui_score: 72,
    mask_urls: [createIllustrativeZoneSvgDataUrl("t_zone")],
  },
  {
    type: "hd_redness",
    region: "whole",
    raw_score: 72.0,
    ui_score: 77,
    mask_urls: [createIllustrativeZoneSvgDataUrl("cheeks")],
  },
  {
    type: "hd_pore",
    region: "whole",
    raw_score: 49.2,
    ui_score: 67,
    mask_urls: [createIllustrativeZoneSvgDataUrl("t_zone")],
  },
  {
    type: "hd_pore",
    region: "forehead",
    raw_score: 79.6,
    ui_score: 80,
    mask_urls: [createIllustrativeZoneSvgDataUrl("forehead")],
  },
  {
    type: "hd_pore",
    region: "nose",
    raw_score: 29.1,
    ui_score: 58,
    mask_urls: [createIllustrativeZoneSvgDataUrl("t_zone")],
  },
  {
    type: "hd_pore",
    region: "cheek",
    raw_score: 44.1,
    ui_score: 65,
    mask_urls: [createIllustrativeZoneSvgDataUrl("cheeks")],
  },
  {
    type: "hd_texture",
    region: "whole",
    raw_score: 66.4,
    ui_score: 75,
    mask_urls: [createIllustrativeZoneSvgDataUrl("full")],
  },
  {
    type: "hd_acne",
    region: "whole",
    raw_score: 59.9,
    ui_score: 76,
    mask_urls: [createIllustrativeZoneSvgDataUrl("t_zone")],
  },
  {
    type: "hd_radiance",
    region: "whole",
    raw_score: 76.6,
    ui_score: 79,
  },
  {
    type: "hd_age_spot",
    region: "whole",
    raw_score: 83.2,
    ui_score: 77,
  },
  {
    type: "hd_wrinkle",
    region: "whole",
    raw_score: 49.6,
    ui_score: 65,
    mask_urls: [createIllustrativeZoneSvgDataUrl("forehead")],
  },
  {
    type: "hd_wrinkle",
    region: "forehead",
    raw_score: 56.0,
    ui_score: 67,
  },
  {
    type: "hd_wrinkle",
    region: "glabellar",
    raw_score: 76.7,
    ui_score: 75,
  },
  {
    type: "hd_wrinkle",
    region: "crowfeet",
    raw_score: 83.4,
    ui_score: 78,
  },
  {
    type: "hd_wrinkle",
    region: "periocular",
    raw_score: 67.9,
    ui_score: 72,
  },
  {
    type: "hd_wrinkle",
    region: "nasolabial",
    raw_score: 74.0,
    ui_score: 74,
  },
  {
    type: "hd_wrinkle",
    region: "marionette",
    raw_score: 71.9,
    ui_score: 73,
  },
  {
    type: "hd_firmness",
    region: "whole",
    raw_score: 89.7,
    ui_score: 85,
  },
  {
    type: "hd_dark_circle",
    region: "whole",
    raw_score: 80.2,
    ui_score: 76,
    mask_urls: [createIllustrativeZoneSvgDataUrl("under_eye")],
  },
  {
    type: "hd_eye_bag",
    region: "whole",
    raw_score: 76.7,
    ui_score: 79,
  },
  // Note: hd_tear_trough, hd_droopy_upper_eyelid, hd_droopy_lower_eyelid are intentionally
  // unreturned here to verify honest representation of missing/unreturned API fields.
  {
    type: "all",
    score: 75.8,
  },
  {
    type: "skin_age",
    score: 37,
  },
];

const PARTIAL_SD_SAMPLE_OUTPUT: YouCamJsonOutputItem[] = [
  {
    type: "moisture",
    raw_score: 54.2,
    ui_score: 68,
    mask_urls: [createIllustrativeZoneSvgDataUrl("cheeks")],
  },
  {
    type: "texture",
    raw_score: 57.3,
    ui_score: 68,
    mask_urls: [createIllustrativeZoneSvgDataUrl("full")],
  },
  {
    type: "pore",
    raw_score: 95.3,
    ui_score: 92,
  },
  {
    type: "redness",
    raw_score: 63.4,
    ui_score: 71,
    mask_urls: [createIllustrativeZoneSvgDataUrl("cheeks")],
  },
];

export type FixturePresetId = "hd-comprehensive" | "sd-partial";

export function buildYouCamDevelopmentFixture(preset: FixturePresetId): NormalizedSkinAnalysisResult {
  const now = new Date().toISOString();

  if (preset === "sd-partial") {
    return normalizeYouCamJsonOutput({
      taskId: "fixture_sd_partial_4metric",
      mode: "sd",
      output: PARTIAL_SD_SAMPLE_OUTPUT,
      requestedActions: ["moisture", "texture", "pore", "redness"],
      dataSource: "development-fixture",
      fixtureLabel: "Development Fixture · Partial 4-Action SD Response (Missing Fields Preserved)",
      analyzedAt: now,
    });
  }

  return normalizeYouCamJsonOutput({
    taskId: "fixture_hd_documented_sample",
    mode: "hd",
    output: DOCUMENTED_HD_SAMPLE_OUTPUT,
    requestedActions: [...HD_DEFAULT_ACTIONS],
    dataSource: "development-fixture",
    fixtureLabel: "Development Fixture · Documented YouCam HD Sample Schema",
    analyzedAt: now,
  });
}

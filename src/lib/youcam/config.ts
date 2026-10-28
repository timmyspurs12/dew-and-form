import type { AnalysisMode, HDConcernAction, SDConcernAction, YouCamDstAction } from "./types";

/**
 * Official Perfect Corp YouCam AI Skin Analysis v2.1 endpoints and protocol constants.
 * Reference: https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1
 */
export const YOUCAM_V21_API = {
  version: "v2.1" as const,
  defaultBaseUrl: "https://yce-api-01.makeupar.com",
  fileEndpoint: "/s2s/v2.0/file",
  fileFallbackEndpoint: "/s2s/v2.0/file/skin-analysis",
  createTaskEndpoint: "/s2s/v2.1/task/skin-analysis",
  getTaskStatusEndpoint: (taskId: string) =>
    `/s2s/v2.1/task/skin-analysis/${encodeURIComponent(taskId)}`,
} as const;

/**
 * Complete verified `RunSkincareTaskDstActions` enum values for Standard Definition (SD)
 * from the official YouCam AI Skin Analysis v2.1 OpenAPI specification.
 */
export const OFFICIAL_V21_SD_ACTIONS: readonly SDConcernAction[] = [
  "wrinkle",
  "droopy_upper_eyelid",
  "droopy_lower_eyelid",
  "firmness",
  "acne",
  "moisture",
  "eye_bag",
  "dark_circle_v2",
  "age_spot",
  "radiance",
  "redness",
  "oiliness",
  "pore",
  "texture",
  "tear_trough",
  "skin_type",
] as const;

/**
 * Complete verified `RunSkincareTaskDstActions` enum values for High Definition (HD)
 * from the official YouCam AI Skin Analysis v2.1 OpenAPI specification.
 */
export const OFFICIAL_V21_HD_ACTIONS: readonly HDConcernAction[] = [
  "hd_wrinkle",
  "hd_droopy_upper_eyelid",
  "hd_droopy_lower_eyelid",
  "hd_firmness",
  "hd_acne",
  "hd_moisture",
  "hd_eye_bag",
  "hd_dark_circle",
  "hd_age_spot",
  "hd_radiance",
  "hd_redness",
  "hd_oiliness",
  "hd_pore",
  "hd_texture",
  "hd_tear_trough",
  "hd_skin_type",
] as const;

const SD_ACTION_SET = new Set<string>(OFFICIAL_V21_SD_ACTIONS);
const HD_ACTION_SET = new Set<string>(OFFICIAL_V21_HD_ACTIONS);

/**
 * Conservative, verified initial production action sets.
 *
 * Rationale:
 * - Every action name is verified against the official YouCam v2.1 `RunSkincareTaskDstActions` enum.
 * - Matches the 3 core categories validated in the playground (`skin_type`, `acne`, `oiliness`).
 * - Stays within Perfect Corp's lowest unit-consumption bracket (1–4 concerns) rather than
 *   requesting all 16 concerns unnecessarily.
 * - Strictly separates SD and HD actions (simultaneous SD + HD actions return HTTP 400 InvalidParameters).
 */
export const CONSERVATIVE_SD_ACTIONS: readonly SDConcernAction[] = [
  "skin_type",
  "acne",
  "oiliness",
] as const;

export const CONSERVATIVE_HD_ACTIONS: readonly HDConcernAction[] = [
  "hd_skin_type",
  "hd_acne",
  "hd_oiliness",
] as const;

/**
 * Timeouts and polling bounds respecting Perfect Corp's S2S v2.1 rate-limit and polling guidance.
 */
export const YOUCAM_TIMING_CONFIG = {
  /** Outbound timeout for File API metadata, task creation, and status checks. */
  apiRequestTimeoutMs: 15_000,
  /** Outbound timeout for binary PUT to pre-signed storage destination. */
  binaryUploadTimeoutMs: 25_000,
  /** Initial client polling interval (avoids aggressive short-interval polling). */
  initialPollIntervalMs: 4_000,
  /** Maximum backoff interval between status checks. */
  maxPollIntervalMs: 8_000,
  /** Overall wall-clock timeout for asynchronous task completion on the client. */
  overallPollTimeoutMs: 90_000,
  /** Per-poll client fetch timeout. */
  clientRequestTimeoutMs: 20_000,
  /** Maximum consecutive transient poll failures tolerated before surfacing an error. */
  maxTransientPollRetries: 2,
} as const;

export function isOfficialV21Action(action: string): action is YouCamDstAction {
  return SD_ACTION_SET.has(action) || HD_ACTION_SET.has(action);
}

/**
 * Validates that a candidate action list is non-empty, belongs strictly to the
 * official YouCam v2.1 enum, and never mixes SD and HD actions.
 */
export function validateV21DstActions(
  actions: readonly string[],
  expectedMode?: AnalysisMode
): { valid: boolean; reason?: string; resolvedMode?: AnalysisMode } {
  if (!Array.isArray(actions) || actions.length === 0) {
    return { valid: false, reason: "At least one dst_action must be specified." };
  }

  const invalidNames = actions.filter((a) => !isOfficialV21Action(a));
  if (invalidNames.length > 0) {
    return {
      valid: false,
      reason: `Unsupported YouCam v2.1 dst_actions: ${invalidNames.join(", ")}.`,
    };
  }

  const hasHd = actions.some((a) => HD_ACTION_SET.has(a));
  const hasSd = actions.some((a) => SD_ACTION_SET.has(a));

  if (hasHd && hasSd) {
    return {
      valid: false,
      reason: "Cannot mix HD and SD dst_actions in a single YouCam AI Skin Analysis v2.1 request.",
    };
  }

  const resolvedMode: AnalysisMode = hasHd ? "hd" : "sd";
  if (expectedMode && resolvedMode !== expectedMode) {
    return {
      valid: false,
      reason: `Action mode mismatch: expected ${expectedMode.toUpperCase()} actions, received ${resolvedMode.toUpperCase()} actions.`,
    };
  }

  return { valid: true, resolvedMode };
}

/**
 * Resolves the centralised conservative `dst_actions` array for a given mode.
 * Supports an optional server-side comma-separated override (`YOUCAM_DST_ACTIONS` / `YOUCAM_HD_DST_ACTIONS`)
 * only if every action passes official v2.1 enum and mode-homogeneity validation.
 */
export function resolveConfiguredDstActions(
  mode: AnalysisMode,
  rawEnvOverride?: string
): YouCamDstAction[] {
  if (rawEnvOverride && rawEnvOverride.trim().length > 0) {
    const parsed = Array.from(
      new Set(
        rawEnvOverride
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
    const check = validateV21DstActions(parsed, mode);
    if (!check.valid) {
      throw new Error(check.reason || "Invalid configured YOUCAM dst_actions override.");
    }
    return parsed as YouCamDstAction[];
  }

  return mode === "hd" ? [...CONSERVATIVE_HD_ACTIONS] : [...CONSERVATIVE_SD_ACTIONS];
}

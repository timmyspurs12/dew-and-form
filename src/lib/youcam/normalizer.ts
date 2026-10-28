import {
  ALL_CANONICAL_CONCERNS,
  CONCERN_METADATA,
  REGION_LABELS,
} from "./metadata";
import type {
  AnalysisDataSource,
  AnalysisMode,
  CanonicalConcernKey,
  NormalizedRegionScore,
  NormalizedSkinAnalysisResult,
  NormalizedSkinMetric,
  NormalizedSkinTypeZone,
  StructuredAnalysisError,
  YouCamApiVersion,
  YouCamEngineErrorCode,
  YouCamJsonOutputItem,
} from "./types";

const ACTION_TO_CANONICAL: Record<string, CanonicalConcernKey> = {
  moisture: "moisture",
  hd_moisture: "moisture",
  oiliness: "oiliness",
  hd_oiliness: "oiliness",
  redness: "redness",
  hd_redness: "redness",
  pore: "pore",
  hd_pore: "pore",
  texture: "texture",
  hd_texture: "texture",
  acne: "acne",
  hd_acne: "acne",
  radiance: "radiance",
  hd_radiance: "radiance",
  age_spot: "age_spot",
  hd_age_spot: "age_spot",
  wrinkle: "wrinkle",
  hd_wrinkle: "wrinkle",
  firmness: "firmness",
  hd_firmness: "firmness",
  dark_circle: "dark_circle",
  dark_circle_v2: "dark_circle",
  hd_dark_circle: "dark_circle",
  eye_bag: "eye_bag",
  hd_eye_bag: "eye_bag",
  tear_trough: "tear_trough",
  hd_tear_trough: "tear_trough",
  droopy_upper_eyelid: "droopy_upper_eyelid",
  hd_droopy_upper_eyelid: "droopy_upper_eyelid",
  droopy_lower_eyelid: "droopy_lower_eyelid",
  hd_droopy_lower_eyelid: "droopy_lower_eyelid",
};

function sanitizeScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0 || value > 100) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

function sanitizeUiScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0 || value > 100) {
    return null;
  }
  return Math.round(value);
}

function pickMaskUrl(urls: unknown): string | null {
  if (!Array.isArray(urls)) return null;
  for (const candidate of urls) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed.startsWith("https://")) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:") {
        return trimmed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

/**
 * Extracts verified `YouCamJsonOutputItem[]` from `data.results` in YouCam v2.1 responses.
 * Supports:
 * 1. Standard v2.1 `format: "json"` envelope `{ output: YouCamJsonOutputItem[] }`
 * 2. Documented `score_info` dictionary shape if an upstream proxy/endpoint returns keyed entries
 * Rejects null, primitive strings, ZIP-only URL envelopes, or malformed structures.
 */
export function extractYouCamOutputItems(
  results: unknown
): { ok: true; items: YouCamJsonOutputItem[] } | { ok: false; reason: string } {
  if (!isPlainObject(results)) {
    return {
      ok: false,
      reason: "YouCam response did not contain a valid results object.",
    };
  }

  if ("output" in results) {
    if (!Array.isArray(results.output)) {
      return {
        ok: false,
        reason: "YouCam results.output was present but not an array.",
      };
    }

    const validItems = results.output.filter(
      (entry): entry is YouCamJsonOutputItem =>
        isPlainObject(entry) && typeof entry.type === "string" && entry.type.trim().length > 0
    );

    if (results.output.length > 0 && validItems.length === 0) {
      return {
        ok: false,
        reason: "YouCam results.output contained no recognisable metric items.",
      };
    }

    return { ok: true, items: validItems };
  }

  // Reject ZIP-only archive responses when JSON format was requested
  if (typeof results.url === "string" && Object.keys(results).length === 1) {
    return {
      ok: false,
      reason: "YouCam returned a ZIP archive URL instead of structured JSON output.",
    };
  }

  // Defensively support documented score_info dictionary shape if returned directly
  const converted: YouCamJsonOutputItem[] = [];
  for (const [key, rawVal] of Object.entries(results)) {
    if (key === "all" && isPlainObject(rawVal) && typeof rawVal.score === "number") {
      converted.push({ type: "all", score: rawVal.score });
      continue;
    }
    if (key === "skin_age") {
      if (typeof rawVal === "number") {
        converted.push({ type: "skin_age", score: rawVal });
      } else if (isPlainObject(rawVal) && typeof rawVal.score === "number") {
        converted.push({ type: "skin_age", score: rawVal.score });
      }
      continue;
    }
    if ((key === "skin_type" || key === "hd_skin_type") && isPlainObject(rawVal)) {
      if (typeof rawVal.skin_type === "string") {
        converted.push({ type: key, region: "whole", skin_type: rawVal.skin_type });
      } else {
        for (const [zoneKey, zoneVal] of Object.entries(rawVal)) {
          if (isPlainObject(zoneVal) && typeof zoneVal.skin_type === "string") {
            converted.push({
              type: key,
              region: zoneKey,
              skin_type: zoneVal.skin_type,
            });
          }
        }
      }
      continue;
    }
    if (key in ACTION_TO_CANONICAL && isPlainObject(rawVal)) {
      if (typeof rawVal.ui_score === "number" || typeof rawVal.raw_score === "number") {
        converted.push({
          type: key,
          region: "whole",
          ui_score: typeof rawVal.ui_score === "number" ? rawVal.ui_score : undefined,
          raw_score: typeof rawVal.raw_score === "number" ? rawVal.raw_score : undefined,
        });
      } else {
        for (const [regionKey, regionVal] of Object.entries(rawVal)) {
          if (
            isPlainObject(regionVal) &&
            (typeof regionVal.ui_score === "number" || typeof regionVal.raw_score === "number")
          ) {
            converted.push({
              type: key,
              region: regionKey,
              ui_score: typeof regionVal.ui_score === "number" ? regionVal.ui_score : undefined,
              raw_score: typeof regionVal.raw_score === "number" ? regionVal.raw_score : undefined,
            });
          }
        }
      }
    }
  }

  if (converted.length > 0) {
    return { ok: true, items: converted };
  }

  return {
    ok: false,
    reason: "YouCam results object did not match any documented v2.1 JSON output schema.",
  };
}

export interface NormalizeYouCamOptions {
  taskId: string;
  apiVersion?: YouCamApiVersion;
  mode: AnalysisMode;
  output: YouCamJsonOutputItem[];
  requestedActions?: string[];
  dataSource: AnalysisDataSource;
  fixtureLabel?: string;
  analyzedAt?: string;
  masksExpireAt?: string | null;
}

/**
 * Normalizes YouCam v2.1 JSON output items while strictly preserving
 * returned scores, facial sub-regions, skin type zones, and unreturned fields.
 * Never fabricates missing metrics or defaults missing values to zero.
 */
export function normalizeYouCamJsonOutput(
  options: NormalizeYouCamOptions
): NormalizedSkinAnalysisResult {
  const {
    taskId,
    apiVersion = "v2.1",
    mode,
    output,
    requestedActions,
    dataSource,
    fixtureLabel,
    analyzedAt = new Date().toISOString(),
  } = options;

  // Official Perfect Corp retention docs: temporary download/mask URLs expire ~2 hours after completion
  const defaultExpiry = new Date(new Date(analyzedAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const masksExpireAt = options.masksExpireAt !== undefined ? options.masksExpireAt : defaultExpiry;

  let overallScore: number | null = null;
  let estimatedSkinAge: number | null = null;
  let resizedImageUrl: string | null = null;

  const skinTypeZones: NormalizedSkinTypeZone[] = [];
  let wholeSkinType: string | null = null;

  const groupedByConcern = new Map<CanonicalConcernKey, YouCamJsonOutputItem[]>();

  for (const item of output) {
    if (!item || typeof item.type !== "string") continue;

    if (item.type === "all") {
      overallScore = sanitizeScore(item.score ?? item.ui_score ?? item.raw_score);
      continue;
    }

    if (item.type === "skin_age") {
      const rawAge = item.score ?? item.ui_score ?? item.raw_score;
      if (typeof rawAge === "number" && Number.isFinite(rawAge) && rawAge > 0 && rawAge <= 120) {
        estimatedSkinAge = Math.round(rawAge);
      }
      continue;
    }

    if (item.type === "resize_image") {
      resizedImageUrl = pickMaskUrl(item.mask_urls);
      continue;
    }

    if (item.type === "skin_type" || item.type === "hd_skin_type") {
      if (typeof item.skin_type === "string" && item.skin_type.trim().length > 0) {
        const zone = item.region || "whole";
        const zoneEntry: NormalizedSkinTypeZone = {
          zone,
          zoneLabel: REGION_LABELS[zone] || zone,
          classification: item.skin_type.trim(),
          maskUrl: pickMaskUrl(item.mask_urls),
        };
        skinTypeZones.push(zoneEntry);
        if (zone === "whole") {
          wholeSkinType = zoneEntry.classification;
        }
      }
      continue;
    }

    const canonical = ACTION_TO_CANONICAL[item.type];
    if (!canonical) continue;

    const existing = groupedByConcern.get(canonical) ?? [];
    existing.push(item);
    groupedByConcern.set(canonical, existing);
  }

  const metrics: NormalizedSkinMetric[] = [];
  const returnedKeys = new Set<CanonicalConcernKey>();

  for (const key of ALL_CANONICAL_CONCERNS) {
    const items = groupedByConcern.get(key);
    if (!items || items.length === 0) continue;

    const meta = CONCERN_METADATA[key];
    const regions: NormalizedRegionScore[] = [];

    const primaryItem: YouCamJsonOutputItem | undefined = items.find(
      (i) => !i.region || i.region === "whole"
    );

    for (const entry of items) {
      const regionKey = entry.region || "whole";
      const uiScore = sanitizeUiScore(entry.ui_score);
      const rawScore = sanitizeScore(entry.raw_score);
      const maskUrl = pickMaskUrl(entry.mask_urls);

      if (uiScore === null && rawScore === null && maskUrl === null) {
        continue;
      }

      regions.push({
        region: regionKey,
        regionLabel: REGION_LABELS[regionKey] || regionKey,
        uiScore,
        rawScore,
        maskUrl,
      });
    }

    // Only treat as measured if at least one region or whole score/mask actually returned data
    if (regions.length === 0) continue;

    const primaryUi = primaryItem ? sanitizeUiScore(primaryItem.ui_score) : null;
    const primaryRaw = primaryItem ? sanitizeScore(primaryItem.raw_score) : null;
    const primaryMask = primaryItem ? pickMaskUrl(primaryItem.mask_urls) : null;

    returnedKeys.add(key);
    metrics.push({
      key,
      apiType: items[0].type,
      label: meta.label,
      group: meta.group,
      uiScore: primaryUi,
      rawScore: primaryRaw,
      maskUrl: primaryMask,
      regions,
    });
  }

  // Track requested canonical concerns to distinguish "not_requested" from "not_returned"
  const requestedCanonicalSet = new Set<CanonicalConcernKey>();
  if (Array.isArray(requestedActions)) {
    for (const action of requestedActions) {
      const canonical = ACTION_TO_CANONICAL[action];
      if (canonical) requestedCanonicalSet.add(canonical);
    }
  }

  const unavailableConcerns = ALL_CANONICAL_CONCERNS.filter((k) => !returnedKeys.has(k)).map(
    (key) => ({
      key,
      label: CONCERN_METADATA[key].label,
      reason: (
        requestedActions && !requestedCanonicalSet.has(key) ? "not_requested" : "not_returned"
      ) as "not_returned" | "not_requested",
    })
  );

  return {
    taskId,
    apiVersion,
    mode,
    requestedActions,
    dataSource,
    fixtureLabel,
    analyzedAt,
    masksExpireAt,
    overallScore,
    estimatedSkinAge,
    resizedImageUrl,
    skinType: {
      whole: wholeSkinType,
      zones: skinTypeZones,
    },
    metrics,
    unavailableConcerns,
  };
}

export function mapYouCamEngineError(
  errorCode: YouCamEngineErrorCode | undefined | null,
  safeFallbackMessage?: string
): StructuredAnalysisError {
  switch (errorCode) {
    case "error_src_face_too_small":
      return {
        category: "image_quality",
        code: errorCode,
        title: "Face appears too distant in the frame",
        message:
          "YouCam requires the face width to occupy roughly 60–80% of the image width so surface details can be read accurately.",
        guidance: [
          "Move closer to the camera or crop out wide background margins.",
          "Hold the camera at eye level in portrait orientation.",
        ],
      };
    case "error_src_face_out_of_bound":
      return {
        category: "image_quality",
        code: errorCode,
        title: "Part of the face is outside the frame",
        message:
          "Your full forehead, cheeks, and chin need to be visible inside the image boundaries.",
        guidance: [
          "Center your face squarely in the frame with a small margin above the forehead.",
          "Sweep fringe or hair away from the forehead and temples.",
        ],
      };
    case "error_lighting_dark":
      return {
        category: "image_quality",
        code: errorCode,
        title: "Ambient lighting is too dim",
        message:
          "The YouCam analysis engine could not evaluate tone and surface texture reliably due to low light.",
        guidance: [
          "Face a bright window with even natural daylight or soft front lighting.",
          "Avoid strong backlighting or harsh overhead shadows.",
        ],
      };
    case "error_no_face":
      return {
        category: "image_quality",
        code: errorCode,
        title: "No front-facing face was detected",
        message:
          "The analysis requires a clear, unobstructed front-facing portrait of a single face.",
        guidance: [
          "Look straight toward the lens with eyes open and mouth relaxed.",
          "Remove sunglasses, masks, or hands near the face.",
        ],
      };
    case "error_pose":
      return {
        category: "image_quality",
        code: errorCode,
        title: "Head angle is tilted or turned away",
        message:
          "A neutral, straight-on pose is required so left and right facial zones are evenly visible.",
        guidance: ["Keep your chin level and look directly into the camera lens."],
      };
    case "error_below_min_image_size":
      return {
        category: "validation",
        code: errorCode,
        title: "Image resolution is below the required minimum",
        message:
          "Standard analysis requires at least 480 px on the short side (1080 px for HD analysis).",
        guidance: ["Upload an uncompressed portrait photo directly from your camera."],
      };
    case "error_exceed_max_image_size":
    case "exceed_max_filesize":
      return {
        category: "validation",
        code: errorCode,
        title: "Image exceeds maximum size limits",
        message: "Please upload a JPEG or PNG photo strictly under 10 MB.",
      };
    case "error_decode_image":
    case "error_nsfw_content_detected":
    case "exceed_nsfw_retry_limits":
      return {
        category: "validation",
        code: errorCode,
        title: "Portrait image could not be accepted",
        message:
          "The submitted image could not be decoded or did not pass content suitability checks. Please select a clear portrait photograph.",
      };
    default:
      return {
        category: "api_failure",
        code:
          typeof errorCode === "string" && errorCode.length <= 64
            ? errorCode
            : "unknown_internal_error",
        title: "Analysis could not be completed",
        message:
          safeFallbackMessage ||
          "The YouCam analysis engine returned an error while processing this image. Failed tasks do not deduct API units.",
        guidance: ["Try again with a clear, evenly lit portrait photo."],
      };
  }
}

import {
  CONSERVATIVE_HD_ACTIONS,
  CONSERVATIVE_SD_ACTIONS,
  OFFICIAL_V21_HD_ACTIONS,
  OFFICIAL_V21_SD_ACTIONS,
  resolveConfiguredDstActions,
  validateV21DstActions,
} from "./config";
import { inspectImageBuffer, type SupportedBinaryImageMime } from "./image-inspector";
import type { AnalysisMode, HDConcernAction, SDConcernAction, YouCamDstAction } from "./types";

/**
 * Official Perfect Corp YouCam AI Skin Analysis v2.1 image constraints
 * (from https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1#section/overview/file-specs-and-errors)
 */
export const YOUCAM_FILE_CONSTRAINTS = {
  acceptedMimeTypes: ["image/jpeg", "image/png"] as const,
  acceptedExtensions: [".jpg", ".jpeg", ".png"] as const,
  /** Official v2.1 spec specifies `< 10MB` strictly. */
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxFileSizeLabel: "10 MB",
  minShortSidePx: {
    sd: 480,
    hd: 1080,
  },
  maxLongSideAutoResizePx: 2560,
  recommendedFaceWidthRatio: "60–80% of frame width",
} as const;

export const SD_DEFAULT_ACTIONS: SDConcernAction[] = [...CONSERVATIVE_SD_ACTIONS];
export const HD_DEFAULT_ACTIONS: HDConcernAction[] = [...CONSERVATIVE_HD_ACTIONS];

export {
  CONSERVATIVE_SD_ACTIONS,
  CONSERVATIVE_HD_ACTIONS,
  OFFICIAL_V21_SD_ACTIONS,
  OFFICIAL_V21_HD_ACTIONS,
};

/**
 * Builds the centralised conservative `dst_actions` array for the requested mode.
 * YouCam v2.1 rejects requests that mix `hd_*` and SD action strings with 400 InvalidParameters.
 */
export function buildDstActions(
  mode: AnalysisMode,
  rawEnvOverride?: string
): YouCamDstAction[] {
  return resolveConfiguredDstActions(mode, rawEnvOverride);
}

export function validateDstActionsNotMixed(actions: string[]): { valid: boolean; reason?: string } {
  const result = validateV21DstActions(actions);
  return { valid: result.valid, reason: result.reason };
}

export interface ImageValidationInput {
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  mode: AnalysisMode;
}

export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSkinImageInput(input: ImageValidationInput): ImageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalizedMime = input.mimeType.toLowerCase();
  const isAllowedMime =
    normalizedMime === "image/jpeg" ||
    normalizedMime === "image/jpg" ||
    normalizedMime === "image/png";

  if (!isAllowedMime) {
    errors.push("Unsupported file format. Please choose a JPEG (.jpg, .jpeg) or PNG (.png) photo.");
  }

  if (input.sizeBytes <= 0) {
    errors.push("The selected image file appears to be empty.");
  } else if (input.sizeBytes >= YOUCAM_FILE_CONSTRAINTS.maxFileSizeBytes) {
    const sizeMb = (input.sizeBytes / (1024 * 1024)).toFixed(2);
    errors.push(
      `File size (${sizeMb} MB) must be strictly under YouCam's ${YOUCAM_FILE_CONSTRAINTS.maxFileSizeLabel} limit.`
    );
  }

  if (typeof input.width === "number" && typeof input.height === "number") {
    const shortSide = Math.min(input.width, input.height);
    const longSide = Math.max(input.width, input.height);
    const minRequired = YOUCAM_FILE_CONSTRAINTS.minShortSidePx[input.mode];

    if (shortSide < minRequired) {
      errors.push(
        input.mode === "hd"
          ? `Image resolution (${input.width} × ${input.height} px) is below the 1080 px short-side minimum required for HD analysis. Switch to Standard (SD, ≥ 480 px) or choose a higher-resolution photo.`
          : `Image resolution (${input.width} × ${input.height} px) is below YouCam's 480 px short-side minimum.`
      );
    }

    if (input.width > input.height * 1.15) {
      warnings.push(
        "Landscape orientation detected. Portrait framing where your face fills 60–80% of the image width yields more reliable detection."
      );
    }

    if (longSide > YOUCAM_FILE_CONSTRAINTS.maxLongSideAutoResizePx) {
      warnings.push(
        `Long side (${longSide} px) exceeds 2560 px; YouCam automatically scales the long edge to 2560 px during analysis.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export type ServerBinaryValidationResult =
  | {
      valid: true;
      mimeType: SupportedBinaryImageMime;
      width: number;
      height: number;
      warnings: string[];
    }
  | {
      valid: false;
      code:
        | "EMPTY_FILE"
        | "FILE_TOO_LARGE"
        | "UNSUPPORTED_BINARY_FORMAT"
        | "MALFORMED_IMAGE"
        | "IMAGE_DIMENSIONS_TOO_SMALL";
      errors: string[];
    };

/**
 * Authoritative server-side image validation executed before any paid YouCam API call.
 * Validates size (< 10 MB), binary magic bytes (JPEG/PNG), intact frame headers,
 * and actual pixel dimensions (>= 480 px SD / >= 1080 px HD) directly from raw bytes.
 */
export function validateServerSkinImageBuffer(
  bytes: Uint8Array,
  mode: AnalysisMode
): ServerBinaryValidationResult {
  if (!bytes || bytes.byteLength === 0) {
    return {
      valid: false,
      code: "EMPTY_FILE",
      errors: ["The uploaded image file appears to be empty."],
    };
  }

  if (bytes.byteLength >= YOUCAM_FILE_CONSTRAINTS.maxFileSizeBytes) {
    const sizeMb = (bytes.byteLength / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      code: "FILE_TOO_LARGE",
      errors: [
        `File size (${sizeMb} MB) must be under YouCam's ${YOUCAM_FILE_CONSTRAINTS.maxFileSizeLabel} maximum limit.`,
      ],
    };
  }

  const binary = inspectImageBuffer(bytes);
  if (!binary.valid) {
    return {
      valid: false,
      code: binary.code,
      errors: [binary.message],
    };
  }

  const check = validateSkinImageInput({
    mimeType: binary.mimeType,
    sizeBytes: bytes.byteLength,
    width: binary.width,
    height: binary.height,
    mode,
  });

  if (!check.valid) {
    return {
      valid: false,
      code: "IMAGE_DIMENSIONS_TOO_SMALL",
      errors: check.errors,
    };
  }

  return {
    valid: true,
    mimeType: binary.mimeType,
    width: binary.width,
    height: binary.height,
    warnings: check.warnings,
  };
}

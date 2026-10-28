export type YouCamApiVersion = "v2.1";

export type AnalysisMode = "sd" | "hd";

/**
 * Verified against Official Perfect Corp YouCam AI Skin Analysis v2.1 OpenAPI enum
 * (`RunSkincareTaskDstActions` at https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1).
 */
export type SDConcernAction =
  | "wrinkle"
  | "droopy_upper_eyelid"
  | "droopy_lower_eyelid"
  | "firmness"
  | "acne"
  | "moisture"
  | "eye_bag"
  | "dark_circle_v2"
  | "age_spot"
  | "radiance"
  | "redness"
  | "oiliness"
  | "pore"
  | "texture"
  | "tear_trough"
  | "skin_type";

/**
 * Verified HD actions in YouCam AI Skin Analysis v2.1 OpenAPI enum
 * (`RunSkincareTaskDstActions`). Never mix with SD actions in a single request.
 */
export type HDConcernAction =
  | "hd_wrinkle"
  | "hd_droopy_upper_eyelid"
  | "hd_droopy_lower_eyelid"
  | "hd_firmness"
  | "hd_acne"
  | "hd_moisture"
  | "hd_eye_bag"
  | "hd_dark_circle"
  | "hd_age_spot"
  | "hd_radiance"
  | "hd_redness"
  | "hd_oiliness"
  | "hd_pore"
  | "hd_texture"
  | "hd_tear_trough"
  | "hd_skin_type";

export type YouCamDstAction = SDConcernAction | HDConcernAction;

export type CanonicalConcernKey =
  | "moisture"
  | "redness"
  | "oiliness"
  | "pore"
  | "texture"
  | "radiance"
  | "acne"
  | "firmness"
  | "wrinkle"
  | "age_spot"
  | "dark_circle"
  | "eye_bag"
  | "tear_trough"
  | "droopy_upper_eyelid"
  | "droopy_lower_eyelid";

export type ConcernGroup =
  | "hydration_balance"
  | "surface_texture"
  | "tone_clarity"
  | "lines_contour";

export type FacialRegion =
  | "whole"
  | "t_zone"
  | "u_zone"
  | "forehead"
  | "nose"
  | "cheek"
  | "glabellar"
  | "crowfeet"
  | "periocular"
  | "nasolabial"
  | "marionette";

export type YouCamEngineErrorCode =
  | "error_below_min_image_size"
  | "error_exceed_max_image_size"
  | "exceed_max_filesize"
  | "error_src_face_too_small"
  | "error_src_face_out_of_bound"
  | "error_lighting_dark"
  | "invalid_parameter"
  | "error_download_image"
  | "error_download_mask"
  | "error_decode_image"
  | "error_decode_mask"
  | "error_nsfw_content_detected"
  | "error_no_face"
  | "error_pose"
  | "error_face_parsing"
  | "error_inference"
  | "exceed_nsfw_retry_limits"
  | "error_upload"
  | "unknown_internal_error"
  | string;

/**
 * Raw item shape inside YouCam v2.1 `data.results.output[]` when `format: "json"` is requested.
 */
export interface YouCamJsonOutputItem {
  type: string;
  region?: string;
  raw_score?: number;
  ui_score?: number;
  score?: number;
  skin_type?: string;
  mask_urls?: string[];
}

/**
 * Request body contract for `POST /s2s/v2.1/task/skin-analysis`
 * (`RunSkincareTaskV2` + v2.1 `pf_camera_kit` extension).
 */
export interface YouCamV21CreateTaskRequest {
  src_file_id: string;
  dst_actions: YouCamDstAction[];
  format: "json";
  miniserver_args?: {
    enable_mask_overlay?: boolean;
  };
  pf_camera_kit?: boolean;
}

/**
 * Response envelope returned by `GET /s2s/v2.1/task/skin-analysis/{task_id}`.
 * Note: HTTP 200 can still carry `task_status: "running"` or `task_status: "error"`.
 */
export interface YouCamTaskStatusPayload {
  status?: number;
  data?: {
    task_id?: string;
    task_status?: "running" | "success" | "error" | "pending" | string;
    error?: YouCamEngineErrorCode | null;
    error_message?: string | null;
    results?:
      | {
          output?: YouCamJsonOutputItem[];
          url?: string;
          [key: string]: unknown;
        }
      | null;
  } | null;
  error?: string;
  error_code?: string;
  error_message?: string;
}

export type AnalysisDataSource = "live-youcam-api" | "development-fixture";

export interface NormalizedRegionScore {
  region: FacialRegion | string;
  regionLabel: string;
  uiScore: number | null;
  rawScore: number | null;
  maskUrl: string | null;
}

export interface NormalizedSkinMetric {
  key: CanonicalConcernKey;
  apiType: string;
  label: string;
  group: ConcernGroup;
  /** Consumer-calibrated integer score on YouCam's 1–100 scale (never a percentage). */
  uiScore: number | null;
  /** Unadjusted floating-point model output on YouCam's 1–100 scale (never a percentage). */
  rawScore: number | null;
  /** Primary temporary mask overlay URL if returned and valid. */
  maskUrl: string | null;
  /** Sub-region breakdown (e.g. forehead, nose, cheek for HD pores; 6 zones for HD wrinkles). */
  regions: NormalizedRegionScore[];
}

export interface NormalizedSkinTypeZone {
  zone: "whole" | "t_zone" | "u_zone" | string;
  zoneLabel: string;
  classification: string;
  maskUrl: string | null;
}

export interface NormalizedSkinAnalysisResult {
  /** Safe public task reference (never exposes raw provider credentials or signed URLs). */
  taskId: string;
  apiVersion?: YouCamApiVersion;
  mode: AnalysisMode;
  requestedActions?: string[];
  dataSource: AnalysisDataSource;
  fixtureLabel?: string;
  analyzedAt: string;
  /** YouCam temporary download/mask URLs expire approximately 2 hours after completion. */
  masksExpireAt: string | null;
  /** YouCam `all.score` (1–100 composite condition index), or null if unreturned. */
  overallScore: number | null;
  /** YouCam `skin_age` estimate relative to general population distribution, or null if unreturned. */
  estimatedSkinAge: number | null;
  /** Resized reference image returned by YouCam (`type: "resize_image"`), if any. */
  resizedImageUrl: string | null;
  /** Skin type classifications across whole face, T-zone, and U-zone if returned. */
  skinType: {
    whole: string | null;
    zones: NormalizedSkinTypeZone[];
  };
  /** Returned, measured concern metrics (never padded with invented zeros). */
  metrics: NormalizedSkinMetric[];
  /** Concerns that were not requested or not returned by the API, tracked explicitly. */
  unavailableConcerns: {
    key: CanonicalConcernKey;
    label: string;
    reason: "not_returned" | "not_requested";
  }[];
}

export type AnalysisErrorCategory =
  | "validation"
  | "api_not_configured"
  | "rate_limited"
  | "expired"
  | "image_quality"
  | "network"
  | "timeout"
  | "unauthorized"
  | "api_failure";

export interface StructuredAnalysisError {
  category: AnalysisErrorCategory;
  code: string;
  title: string;
  message: string;
  guidance?: string[];
  retryAfterSeconds?: number;
}

/**
 * Consistent Dew & Form application response contract across task creation and polling.
 */
export type AnalysisApiEnvelope =
  | {
      status: "processing";
      taskId: string;
      publicRef: string;
      mode: AnalysisMode;
      pollAfterMs: number;
    }
  | {
      status: "success";
      taskId: string;
      publicRef: string;
      result: NormalizedSkinAnalysisResult;
    }
  | {
      status: "error";
      taskId?: string;
      publicRef?: string;
      error: StructuredAnalysisError;
    };

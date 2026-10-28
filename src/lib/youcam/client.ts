import "server-only";
import {
  CONSERVATIVE_HD_ACTIONS,
  CONSERVATIVE_SD_ACTIONS,
  resolveConfiguredDstActions,
  validateV21DstActions,
  YOUCAM_TIMING_CONFIG,
  YOUCAM_V21_API,
} from "./config";
import {
  extractYouCamOutputItems,
  mapYouCamEngineError,
  normalizeYouCamJsonOutput,
} from "./normalizer";
import {
  isValidProviderTaskId,
  redactSensitiveText,
  sanitizeUploadFileName,
} from "./security";
import type {
  AnalysisMode,
  NormalizedSkinAnalysisResult,
  StructuredAnalysisError,
  YouCamDstAction,
  YouCamTaskStatusPayload,
  YouCamV21CreateTaskRequest,
} from "./types";

export class YouCamServiceError extends Error {
  public readonly httpStatus: number;
  public readonly structured: StructuredAnalysisError;

  constructor(httpStatus: number, structured: StructuredAnalysisError) {
    super(structured.message);
    this.name = "YouCamServiceError";
    this.httpStatus = httpStatus;
    this.structured = structured;
  }
}

export function getYouCamServerConfig() {
  const apiKey = process.env.YOUCAM_API_KEY?.trim() || "";
  const baseUrl = (
    process.env.YOUCAM_API_BASE_URL?.trim() || YOUCAM_V21_API.defaultBaseUrl
  ).replace(/\/+$/, "");

  const defaultMode: AnalysisMode =
    process.env.YOUCAM_ANALYSIS_MODE?.trim().toLowerCase() === "hd" ? "hd" : "sd";

  return {
    isConfigured: apiKey.length > 0,
    apiVersion: YOUCAM_V21_API.version,
    apiKey,
    baseUrl,
    defaultMode,
    defaultActions: {
      sd: [...CONSERVATIVE_SD_ACTIONS],
      hd: [...CONSERVATIVE_HD_ACTIONS],
    },
  };
}

function isAbortOrTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err && typeof err.name === "string" ? err.name : "";
  return name === "TimeoutError" || name === "AbortError";
}

function parseRetryAfterSeconds(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 3600) {
    return parsed;
  }
  return undefined;
}

function sanitizeProviderMessage(raw: unknown, apiKey: string): string | undefined {
  if (typeof raw !== "string" || raw.trim().length === 0) return undefined;
  const redacted = redactSensitiveText(raw.trim(), [apiKey]);
  if (!redacted) return undefined;
  return redacted.length > 220 ? `${redacted.slice(0, 217)}...` : redacted;
}

/**
 * Validates that the pre-signed upload destination returned by YouCam's File API
 * uses HTTPS and does not target loopback or link-local metadata addresses (SSRF guard).
 */
function isSafePresignedUploadUrl(rawUrl: unknown): rawUrl is string {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.startsWith("169.254.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function parseJsonSafely<T>(res: Response, context: string): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code: "MALFORMED_PROVIDER_RESPONSE",
      title: `Unexpected response from YouCam during ${context}`,
      message:
        "Perfect Corp YouCam returned a non-JSON or truncated payload. No local skin scores were fabricated.",
    });
  }
}

async function handleYouCamHttpError(
  res: Response,
  context: string,
  apiKey: string
): Promise<never> {
  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  const rawCode =
    (typeof payload?.error_code === "string" ? payload.error_code : undefined) ||
    (typeof payload?.error === "string" ? payload.error : undefined);

  const safeCode =
    rawCode && /^[A-Za-z0-9_.-]{1,64}$/.test(rawCode) ? rawCode : `HTTP_${res.status}`;

  const safeMessage =
    sanitizeProviderMessage(payload?.error_message, apiKey) ||
    sanitizeProviderMessage(payload?.message, apiKey);

  if (res.status === 429) {
    const retryAfter = parseRetryAfterSeconds(res.headers) ?? 30;
    throw new YouCamServiceError(429, {
      category: "rate_limited",
      code: "TooManyRequests",
      title: "Analysis service is temporarily rate-limited",
      message:
        "Too many skin analysis requests were sent in a short window. Please pause briefly before retrying.",
      retryAfterSeconds: retryAfter,
    });
  }

  if (res.status === 401 || res.status === 403) {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code: "InvalidApiKey",
      title: "Server authentication with YouCam failed",
      message:
        "The server's YOUCAM_API_KEY was rejected by Perfect Corp's S2S v2.1 API. Verify the server credential in your environment configuration.",
    });
  }

  if (res.status === 404 || safeCode === "InvalidTaskId") {
    throw new YouCamServiceError(410, {
      category: "expired",
      code: "InvalidOrExpiredTask",
      title: "Analysis task has expired or is unavailable",
      message:
        "This YouCam analysis task is no longer available. Please start a fresh skin analysis.",
    });
  }

  if (safeCode === "CreditInsufficiency" || res.status === 402) {
    throw new YouCamServiceError(402, {
      category: "api_failure",
      code: "CreditInsufficiency",
      title: "YouCam API units exhausted",
      message:
        "The connected YouCam developer account does not have sufficient remaining API units to complete this request.",
    });
  }

  if (res.status === 400 || safeCode === "InvalidParameters") {
    throw new YouCamServiceError(400, {
      category: "validation",
      code: safeCode === "HTTP_400" ? "InvalidParameters" : safeCode,
      title: "YouCam rejected the analysis parameters",
      message:
        safeMessage ||
        "The submitted image or task parameters were rejected by YouCam AI Skin Analysis v2.1.",
    });
  }

  throw new YouCamServiceError(res.status >= 400 && res.status < 600 ? res.status : 502, {
    category: "api_failure",
    code: safeCode,
    title: `Unable to complete ${context}`,
    message:
      safeMessage ||
      `Perfect Corp YouCam API returned status ${res.status} during ${context}. Please try again shortly.`,
  });
}

export interface SubmitSkinAnalysisInput {
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png";
  fileName?: string;
  mode: AnalysisMode;
}

export interface SubmitSkinAnalysisOutput {
  providerTaskId: string;
  mode: AnalysisMode;
  requestedActions: YouCamDstAction[];
}

/**
 * Executes Official Perfect Corp YouCam S2S v2.1 Skin Analysis submission server-side:
 * 1. POST /s2s/v2.0/file (fallback /s2s/v2.0/file/skin-analysis on 404) -> file_id + pre-signed PUT URL
 * 2. PUT binary bytes to pre-signed URL (without leaking Bearer credentials)
 * 3. POST /s2s/v2.1/task/skin-analysis (src_file_id, conservative verified dst_actions, format: "json") -> task_id
 */
export async function submitYouCamSkinAnalysis(
  input: SubmitSkinAnalysisInput
): Promise<SubmitSkinAnalysisOutput> {
  const { isConfigured, apiKey, baseUrl } = getYouCamServerConfig();

  if (!isConfigured) {
    throw new YouCamServiceError(503, {
      category: "api_not_configured",
      code: "YOUCAM_API_KEY_MISSING",
      title: "Live YouCam API key is not configured on this server",
      message:
        "Set YOUCAM_API_KEY in your server environment (.env.local or deployment secrets) to run live YouCam AI Skin Analysis v2.1. To inspect the interface without spending live API units, use the clearly marked Development Fixture preview.",
      guidance: [
        "Configure YOUCAM_API_KEY on the server only (never expose as NEXT_PUBLIC_).",
        "Or open Development Fixture & State Preview to inspect documented YouCam responses.",
      ],
    });
  }

  const rawOverride =
    input.mode === "hd" ? process.env.YOUCAM_HD_DST_ACTIONS : process.env.YOUCAM_DST_ACTIONS;

  let dstActions: YouCamDstAction[];
  try {
    dstActions = resolveConfiguredDstActions(input.mode, rawOverride);
  } catch (err) {
    throw new YouCamServiceError(500, {
      category: "api_failure",
      code: "INVALID_SERVER_ACTION_CONFIG",
      title: "Invalid server action configuration",
      message:
        err instanceof Error
          ? redactSensitiveText(err.message, [apiKey])
          : "Invalid server dst_actions configuration.",
    });
  }

  const actionCheck = validateV21DstActions(dstActions, input.mode);
  if (!actionCheck.valid) {
    throw new YouCamServiceError(400, {
      category: "validation",
      code: "InvalidParameters",
      title: "Invalid analysis configuration",
      message: actionCheck.reason || "Invalid dst_actions.",
    });
  }

  const safeFileName = sanitizeUploadFileName(input.fileName, input.mimeType);
  const filePayload = {
    files: [
      {
        content_type: input.mimeType,
        file_name: safeFileName,
        file_size: input.buffer.byteLength,
      },
    ],
  };

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Step 1: Request pre-signed upload destination via File API
  let fileRes: Response;
  try {
    fileRes = await fetch(`${baseUrl}${YOUCAM_V21_API.fileEndpoint}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(filePayload),
      cache: "no-store",
      signal: AbortSignal.timeout(YOUCAM_TIMING_CONFIG.apiRequestTimeoutMs),
    });

    if (fileRes.status === 404) {
      fileRes = await fetch(`${baseUrl}${YOUCAM_V21_API.fileFallbackEndpoint}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(filePayload),
        cache: "no-store",
        signal: AbortSignal.timeout(YOUCAM_TIMING_CONFIG.apiRequestTimeoutMs),
      });
    }
  } catch (err) {
    if (isAbortOrTimeoutError(err)) {
      throw new YouCamServiceError(504, {
        category: "timeout",
        code: "FILE_INIT_TIMEOUT",
        title: "Upload preparation timed out",
        message:
          "Perfect Corp YouCam did not respond within the timeout window while preparing secure image upload.",
      });
    }
    throw new YouCamServiceError(502, {
      category: "network",
      code: "NETWORK_UNREACHABLE",
      title: "Could not reach Perfect Corp YouCam API",
      message:
        "Outbound network connection to yce-api-01.makeupar.com failed from this server environment.",
    });
  }

  if (!fileRes.ok) {
    await handleYouCamHttpError(fileRes, "image upload initialization", apiKey);
  }

  const fileJson = await parseJsonSafely<{
    status?: number;
    data?: {
      files?: Array<{
        file_id?: string;
        requests?: Array<{
          method?: string;
          url?: string;
          headers?: Record<string, string>;
        }>;
      }>;
    };
  }>(fileRes, "image upload initialization");

  const firstFile = fileJson?.data?.files?.[0];
  const fileId = firstFile?.file_id;
  const uploadRequest = firstFile?.requests?.[0];

  if (
    typeof fileId !== "string" ||
    fileId.trim().length === 0 ||
    fileId.length > 512 ||
    !uploadRequest ||
    !isSafePresignedUploadUrl(uploadRequest.url)
  ) {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code: "MALFORMED_FILE_RESPONSE",
      title: "Unexpected response during upload preparation",
      message:
        "YouCam File API did not return a valid file_id and HTTPS upload destination.",
    });
  }

  // Step 2: PUT binary image bytes to pre-signed URL (never attach YouCam Bearer key here!)
  const putHeaders: Record<string, string> = {
    "Content-Type": input.mimeType,
  };
  if (uploadRequest.headers && typeof uploadRequest.headers === "object") {
    for (const [k, v] of Object.entries(uploadRequest.headers)) {
      const lower = k.toLowerCase();
      if (lower === "authorization" || lower === "host") continue;
      if (typeof v === "string") {
        putHeaders[k] = v;
      }
    }
  }

  const uploadMethod =
    typeof uploadRequest.method === "string" && uploadRequest.method.toUpperCase() === "PUT"
      ? "PUT"
      : "PUT";

  let putRes: Response;
  try {
    putRes = await fetch(uploadRequest.url, {
      method: uploadMethod,
      headers: putHeaders,
      body: new Uint8Array(input.buffer),
      cache: "no-store",
      signal: AbortSignal.timeout(YOUCAM_TIMING_CONFIG.binaryUploadTimeoutMs),
    });
  } catch (err) {
    if (isAbortOrTimeoutError(err)) {
      throw new YouCamServiceError(504, {
        category: "timeout",
        code: "UPLOAD_TRANSFER_TIMEOUT",
        title: "Image upload timed out",
        message:
          "Transferring your portrait to YouCam's temporary upload destination timed out. Please retry.",
      });
    }
    throw new YouCamServiceError(502, {
      category: "network",
      code: "UPLOAD_TRANSFER_FAILED",
      title: "Image transfer to upload target failed",
      message: "A network error interrupted transferring image bytes to YouCam storage.",
    });
  }

  if (!putRes.ok) {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code: `PUT_HTTP_${putRes.status}`,
      title: "Image storage transfer was rejected",
      message: `Temporary upload storage returned HTTP ${putRes.status}. No skin analysis task was created.`,
    });
  }

  // Step 3: Create AI Skin Analysis Task via Official V2.1 Endpoint
  const taskRequestBody: YouCamV21CreateTaskRequest = {
    src_file_id: fileId,
    dst_actions: dstActions,
    format: "json",
    miniserver_args: {
      enable_mask_overlay: false,
    },
    pf_camera_kit: false,
  };

  let taskRes: Response;
  try {
    taskRes = await fetch(`${baseUrl}${YOUCAM_V21_API.createTaskEndpoint}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(taskRequestBody),
      cache: "no-store",
      signal: AbortSignal.timeout(YOUCAM_TIMING_CONFIG.apiRequestTimeoutMs),
    });
  } catch (err) {
    if (isAbortOrTimeoutError(err)) {
      throw new YouCamServiceError(504, {
        category: "timeout",
        code: "TASK_CREATE_TIMEOUT",
        title: "Task creation timed out",
        message: "YouCam v2.1 task submission timed out before returning a task identifier.",
      });
    }
    throw new YouCamServiceError(502, {
      category: "network",
      code: "TASK_NETWORK_ERROR",
      title: "Could not submit analysis task",
      message: "Network connection interrupted while starting the YouCam v2.1 skin analysis task.",
    });
  }

  if (!taskRes.ok) {
    await handleYouCamHttpError(taskRes, "skin analysis v2.1 task creation", apiKey);
  }

  const taskJson = await parseJsonSafely<{
    status?: number;
    data?: { task_id?: string } | null;
    error?: string;
    error_code?: string;
    error_message?: string;
  }>(taskRes, "skin analysis v2.1 task creation");

  if (typeof taskJson?.status === "number" && taskJson.status >= 400) {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code:
        typeof taskJson.error_code === "string"
          ? taskJson.error_code
          : `PROVIDER_STATUS_${taskJson.status}`,
      title: "YouCam rejected task creation",
      message:
        sanitizeProviderMessage(taskJson.error_message || taskJson.error, apiKey) ||
        "YouCam returned an error status inside the task creation response.",
    });
  }

  const providerTaskId = taskJson?.data?.task_id;
  if (!isValidProviderTaskId(providerTaskId)) {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code: "MISSING_TASK_ID",
      title: "Task identifier missing from response",
      message: "YouCam v2.1 accepted the request but did not return a valid task_id.",
    });
  }

  return {
    providerTaskId,
    mode: input.mode,
    requestedActions: dstActions,
  };
}

export interface PollSkinAnalysisInput {
  providerTaskId: string;
  publicRef: string;
  mode: AnalysisMode;
  requestedActions: YouCamDstAction[];
}

export type PollSkinAnalysisOutcome =
  | {
      status: "processing";
      pollAfterMs: number;
    }
  | {
      status: "success";
      result: NormalizedSkinAnalysisResult;
    }
  | {
      status: "error";
      error: StructuredAnalysisError;
    };

/**
 * Polls Official Perfect Corp YouCam S2S v2.1 Task Status:
 * `GET /s2s/v2.1/task/skin-analysis/{task_id}`
 * Never assumes HTTP 200 implies task completion (`task_status` may be "running" or "error").
 */
export async function pollYouCamSkinAnalysisTask(
  input: PollSkinAnalysisInput
): Promise<PollSkinAnalysisOutcome> {
  const { isConfigured, apiKey, baseUrl } = getYouCamServerConfig();

  if (!isConfigured) {
    throw new YouCamServiceError(503, {
      category: "api_not_configured",
      code: "YOUCAM_API_KEY_MISSING",
      title: "Live YouCam API key is not configured",
      message: "Cannot poll live YouCam v2.1 task without YOUCAM_API_KEY configured on the server.",
    });
  }

  if (!isValidProviderTaskId(input.providerTaskId)) {
    throw new YouCamServiceError(400, {
      category: "validation",
      code: "INVALID_TASK_ID",
      title: "Invalid task identifier",
      message: "The provider task identifier failed format verification.",
    });
  }

  let res: Response;
  try {
    res = await fetch(
      `${baseUrl}${YOUCAM_V21_API.getTaskStatusEndpoint(input.providerTaskId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(YOUCAM_TIMING_CONFIG.apiRequestTimeoutMs),
      }
    );
  } catch (err) {
    if (isAbortOrTimeoutError(err)) {
      throw new YouCamServiceError(504, {
        category: "timeout",
        code: "POLL_TIMEOUT_UPSTREAM",
        title: "Status check timed out",
        message: "YouCam v2.1 took too long to respond to the status check.",
      });
    }
    throw new YouCamServiceError(502, {
      category: "network",
      code: "POLL_NETWORK_ERROR",
      title: "Connection lost while checking analysis status",
      message: "Unable to reach YouCam while polling for your skin analysis result.",
    });
  }

  if (!res.ok) {
    await handleYouCamHttpError(res, "task status polling", apiKey);
  }

  const payload = await parseJsonSafely<YouCamTaskStatusPayload>(res, "task status polling");

  if (!payload || typeof payload !== "object") {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code: "MALFORMED_PROVIDER_RESPONSE",
      title: "Invalid task status envelope",
      message: "YouCam returned an empty or malformed status response.",
    });
  }

  // Guard against error envelopes wrapped inside HTTP 200
  if (typeof payload.status === "number" && payload.status >= 400 && !payload.data?.task_status) {
    throw new YouCamServiceError(502, {
      category: "api_failure",
      code:
        typeof payload.error_code === "string"
          ? payload.error_code
          : `PROVIDER_STATUS_${payload.status}`,
      title: "Provider error while checking status",
      message:
        sanitizeProviderMessage(payload.error_message || payload.error, apiKey) ||
        "YouCam returned an error status during task polling.",
    });
  }

  const taskStatus = payload.data?.task_status;

  if (taskStatus === "running" || taskStatus === "pending") {
    return {
      status: "processing",
      pollAfterMs: YOUCAM_TIMING_CONFIG.initialPollIntervalMs,
    };
  }

  if (taskStatus === "error") {
    const safeMsg = sanitizeProviderMessage(payload.data?.error_message, apiKey);
    return {
      status: "error",
      error: mapYouCamEngineError(payload.data?.error, safeMsg),
    };
  }

  if (taskStatus === "success") {
    const extracted = extractYouCamOutputItems(payload.data?.results);
    if (!extracted.ok) {
      throw new YouCamServiceError(502, {
        category: "api_failure",
        code: "UNEXPECTED_RESULT_FORMAT",
        title: "Unexpected result format from YouCam v2.1",
        message: extracted.reason,
      });
    }

    const detectedMode: AnalysisMode = extracted.items.some(
      (item) => typeof item.type === "string" && item.type.startsWith("hd_")
    )
      ? "hd"
      : input.mode;

    const normalized = normalizeYouCamJsonOutput({
      taskId: input.publicRef,
      apiVersion: "v2.1",
      mode: detectedMode,
      output: extracted.items,
      requestedActions: input.requestedActions,
      dataSource: "live-youcam-api",
    });

    return {
      status: "success",
      result: normalized,
    };
  }

  throw new YouCamServiceError(502, {
    category: "api_failure",
    code: "UNKNOWN_TASK_STATUS",
    title: "Unrecognised task state",
    message: "YouCam v2.1 returned an unrecognised task_status value.",
  });
}

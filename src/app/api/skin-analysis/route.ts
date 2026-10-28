import { NextResponse } from "next/server";
import {
  getYouCamServerConfig,
  submitYouCamSkinAnalysis,
  YouCamServiceError,
} from "@/lib/youcam/client";
import { YOUCAM_TIMING_CONFIG } from "@/lib/youcam/config";
import {
  buildSessionSetCookieHeader,
  enforceRateLimit,
  extractClientRateKey,
  getOrCreateSession,
  issueSessionBoundTaskToken,
  verifySameOriginRequest,
} from "@/lib/youcam/security";
import {
  validateServerSkinImageBuffer,
  YOUCAM_FILE_CONSTRAINTS,
} from "@/lib/youcam/validation";
import type {
  AnalysisApiEnvelope,
  AnalysisMode,
  StructuredAnalysisError,
} from "@/lib/youcam/types";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function jsonEnvelope(
  body: AnalysisApiEnvelope,
  status: number,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      ...(extraHeaders || {}),
    },
  });
}

export async function POST(request: Request) {
  const originCheck = verifySameOriginRequest(request);
  if (!originCheck.ok && originCheck.error) {
    return jsonEnvelope({ status: "error", error: originCheck.error }, 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    const err: StructuredAnalysisError = {
      category: "validation",
      code: "INVALID_CONTENT_TYPE",
      title: "Expected multipart image upload",
      message: "Please upload a JPEG or PNG portrait photograph using multipart/form-data.",
    };
    return jsonEnvelope({ status: "error", error: err }, 400);
  }

  // Reject obviously oversized multipart bodies early before buffering
  const contentLengthRaw = request.headers.get("content-length");
  if (contentLengthRaw) {
    const contentLength = Number.parseInt(contentLengthRaw, 10);
    if (
      Number.isFinite(contentLength) &&
      contentLength > YOUCAM_FILE_CONSTRAINTS.maxFileSizeBytes + 512 * 1024
    ) {
      const err: StructuredAnalysisError = {
        category: "validation",
        code: "FILE_TOO_LARGE",
        title: "Image exceeds maximum size limit",
        message: `Uploaded payload exceeds YouCam's ${YOUCAM_FILE_CONSTRAINTS.maxFileSizeLabel} maximum limit.`,
      };
      return jsonEnvelope({ status: "error", error: err }, 413);
    }
  }

  const { sessionId, isNew } = getOrCreateSession(request);
  const sessionHeaders: Record<string, string> = isNew
    ? { "Set-Cookie": buildSessionSetCookieHeader(sessionId) }
    : {};

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      const err: StructuredAnalysisError = {
        category: "validation",
        code: "MALFORMED_FORM_DATA",
        title: "Malformed upload payload",
        message: "Could not read multipart form data from the submitted request.",
      };
      return jsonEnvelope({ status: "error", error: err }, 400, sessionHeaders);
    }

    const file = formData.get("image");
    const rawMode = formData.get("mode");
    const { defaultMode } = getYouCamServerConfig();

    if (rawMode !== null && rawMode !== "sd" && rawMode !== "hd") {
      const err: StructuredAnalysisError = {
        category: "validation",
        code: "INVALID_ANALYSIS_MODE",
        title: "Unsupported analysis mode",
        message: "Analysis mode must be either 'sd' (Standard) or 'hd' (High-Definition).",
      };
      return jsonEnvelope({ status: "error", error: err }, 400, sessionHeaders);
    }

    const mode: AnalysisMode =
      rawMode === "hd" ? "hd" : rawMode === "sd" ? "sd" : defaultMode;

    if (
      !file ||
      typeof file === "string" ||
      typeof (file as Blob).arrayBuffer !== "function"
    ) {
      const err: StructuredAnalysisError = {
        category: "validation",
        code: "MISSING_IMAGE",
        title: "No portrait image received",
        message: "Please select a JPEG or PNG portrait photograph before starting the analysis.",
      };
      return jsonEnvelope({ status: "error", error: err }, 400, sessionHeaders);
    }

    const uploadBlob = file as File;
    if (uploadBlob.size <= 0) {
      const err: StructuredAnalysisError = {
        category: "validation",
        code: "EMPTY_FILE",
        title: "Selected image file is empty",
        message: "The uploaded file contains 0 bytes. Please choose a valid JPEG or PNG portrait.",
      };
      return jsonEnvelope({ status: "error", error: err }, 400, sessionHeaders);
    }

    if (uploadBlob.size >= YOUCAM_FILE_CONSTRAINTS.maxFileSizeBytes) {
      const sizeMb = (uploadBlob.size / (1024 * 1024)).toFixed(2);
      const err: StructuredAnalysisError = {
        category: "validation",
        code: "FILE_TOO_LARGE",
        title: "Image exceeds 10 MB limit",
        message: `File size (${sizeMb} MB) must be strictly under YouCam's ${YOUCAM_FILE_CONSTRAINTS.maxFileSizeLabel} maximum limit.`,
      };
      return jsonEnvelope({ status: "error", error: err }, 400, sessionHeaders);
    }

    // Read raw bytes and verify actual magic bytes + binary image dimensions BEFORE any paid API call
    const arrayBuffer = await uploadBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const binaryValidation = validateServerSkinImageBuffer(buffer, mode);
    if (!binaryValidation.valid) {
      const err: StructuredAnalysisError = {
        category: "validation",
        code: binaryValidation.code,
        title: "Image does not meet analysis specifications",
        message: binaryValidation.errors.join(" "),
      };
      return jsonEnvelope({ status: "error", error: err }, 400, sessionHeaders);
    }

    // Apply per-session/IP task-creation rate limit after cheap local validation
    const clientKey = extractClientRateKey(request, sessionId);
    const rateCheck = enforceRateLimit("create_task", clientKey);
    if (!rateCheck.allowed) {
      return jsonEnvelope(
        { status: "error", error: rateCheck.error },
        429,
        {
          ...sessionHeaders,
          "Retry-After": String(rateCheck.retryAfterSeconds),
        }
      );
    }

    const submitted = await submitYouCamSkinAnalysis({
      buffer,
      mimeType: binaryValidation.mimeType,
      fileName: typeof uploadBlob.name === "string" ? uploadBlob.name : undefined,
      mode,
    });

    const { token, publicRef } = issueSessionBoundTaskToken({
      sessionId,
      providerTaskId: submitted.providerTaskId,
      mode: submitted.mode,
      requestedActions: submitted.requestedActions,
    });

    return jsonEnvelope(
      {
        status: "processing",
        taskId: token,
        publicRef,
        mode: submitted.mode,
        pollAfterMs: YOUCAM_TIMING_CONFIG.initialPollIntervalMs,
      },
      202,
      sessionHeaders
    );
  } catch (err) {
    if (err instanceof YouCamServiceError) {
      const extra: Record<string, string> = { ...sessionHeaders };
      if (err.httpStatus === 429 && err.structured.retryAfterSeconds) {
        extra["Retry-After"] = String(err.structured.retryAfterSeconds);
      }
      return jsonEnvelope(
        { status: "error", error: err.structured },
        err.httpStatus,
        extra
      );
    }

    const fallback: StructuredAnalysisError = {
      category: "api_failure",
      code: "INTERNAL_PROXY_ERROR",
      title: "Unable to initiate skin analysis",
      message: "An unexpected server error occurred while preparing your analysis task.",
    };
    return jsonEnvelope({ status: "error", error: fallback }, 500, sessionHeaders);
  }
}

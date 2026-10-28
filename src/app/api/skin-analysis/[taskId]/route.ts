import { NextResponse } from "next/server";
import { pollYouCamSkinAnalysisTask, YouCamServiceError } from "@/lib/youcam/client";
import {
  enforceRateLimit,
  extractClientRateKey,
  readSessionIdFromRequest,
  verifySessionBoundTaskToken,
} from "@/lib/youcam/security";
import type { AnalysisApiEnvelope, StructuredAnalysisError } from "@/lib/youcam/types";

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

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId: rawTaskId } = await context.params;
    const taskId = typeof rawTaskId === "string" ? decodeURIComponent(rawTaskId).trim() : "";

    if (!taskId) {
      const err: StructuredAnalysisError = {
        category: "validation",
        code: "MISSING_TASK_ID",
        title: "Missing task identifier",
        message: "A valid analysis task identifier is required to check status.",
      };
      return jsonEnvelope({ status: "error", error: err }, 400);
    }

    const sessionId = readSessionIdFromRequest(request);
    const verified = verifySessionBoundTaskToken(taskId, sessionId);
    if (!verified.ok) {
      return jsonEnvelope(
        { status: "error", error: verified.error },
        verified.httpStatus
      );
    }

    const clientKey = extractClientRateKey(request, sessionId);
    const rateCheck = enforceRateLimit("poll_task", clientKey);
    if (!rateCheck.allowed) {
      return jsonEnvelope(
        { status: "error", error: rateCheck.error },
        429,
        { "Retry-After": String(rateCheck.retryAfterSeconds) }
      );
    }

    const { tid, ref, mode, act } = verified.payload;
    const outcome = await pollYouCamSkinAnalysisTask({
      providerTaskId: tid,
      publicRef: ref,
      mode,
      requestedActions: act,
    });

    if (outcome.status === "processing") {
      return jsonEnvelope(
        {
          status: "processing",
          taskId,
          publicRef: ref,
          mode,
          pollAfterMs: outcome.pollAfterMs,
        },
        200
      );
    }

    if (outcome.status === "error") {
      return jsonEnvelope(
        {
          status: "error",
          taskId,
          publicRef: ref,
          error: outcome.error,
        },
        200
      );
    }

    return jsonEnvelope(
      {
        status: "success",
        taskId,
        publicRef: ref,
        result: outcome.result,
      },
      200
    );
  } catch (err) {
    if (err instanceof YouCamServiceError) {
      const extra: Record<string, string> = {};
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
      code: "POLL_PROXY_ERROR",
      title: "Unable to retrieve task status",
      message: "An unexpected server error occurred while checking your analysis task.",
    };
    return jsonEnvelope({ status: "error", error: fallback }, 500);
  }
}

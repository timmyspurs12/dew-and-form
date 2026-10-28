import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AnalysisMode, StructuredAnalysisError, YouCamDstAction } from "./types";

export const SESSION_COOKIE_NAME = "df_sid";

const EPHEMERAL_PROCESS_SECRET = randomBytes(32).toString("hex");
const SAFE_SESSION_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const SAFE_PROVIDER_TASK_ID_RE = /^[A-Za-z0-9._:=+~-]{1,256}$/;

function getSigningKey(): Buffer {
  const configured =
    process.env.YOUCAM_TASK_SIGNING_SECRET?.trim() ||
    process.env.YOUCAM_API_KEY?.trim() ||
    EPHEMERAL_PROCESS_SECRET;

  return createHash("sha256")
    .update(`dew-and-form:v2.1:task-token:${configured}`)
    .digest();
}

/**
 * Scrubs API keys, Bearer tokens, and pre-signed storage query strings from any
 * string so sensitive credentials or temporary URLs never leak to logs or responses.
 */
export function redactSensitiveText(input: unknown, extraSecrets: string[] = []): string {
  if (typeof input !== "string" || input.length === 0) {
    return "";
  }

  let clean = input;

  const envKey = process.env.YOUCAM_API_KEY?.trim();
  const secrets = [envKey, ...extraSecrets].filter(
    (s): s is string => typeof s === "string" && s.length >= 4
  );

  for (const secret of secrets) {
    clean = clean.split(secret).join("[REDACTED]");
  }

  // Redact Authorization Bearer values
  clean = clean.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]");

  // Redact pre-signed cloud storage URLs and query signatures
  clean = clean.replace(
    /https?:\/\/[^\s"'<>]+(?:\?|&)(?:X-Amz-Signature|Signature|AWSAccessKeyId|sig|token)=[^\s"'<>]*/gi,
    "[REDACTED_SIGNED_URL]"
  );
  clean = clean.replace(
    /([?&](?:X-Amz-Credential|X-Amz-Signature|X-Amz-Security-Token|AWSAccessKeyId|Signature|api_key|apikey)=)[^&\s"'<>]+/gi,
    "$1[REDACTED]"
  );

  return clean;
}

/**
 * Sanitizes an uploaded filename so path traversal characters, control bytes, or
 * excessively long names are never forwarded upstream.
 */
export function sanitizeUploadFileName(rawName: string | undefined, mimeType: "image/jpeg" | "image/png"): string {
  const ext = mimeType === "image/png" ? ".png" : ".jpg";
  if (!rawName || typeof rawName !== "string") {
    return `portrait${ext}`;
  }
  const base = rawName
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/\.+/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 48);

  if (!base) {
    return `portrait${ext}`;
  }
  const withoutExt = base.replace(/\.(jpe?g|png)$/i, "") || "portrait";
  return `${withoutExt}${ext}`;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

export function readSessionIdFromRequest(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  const candidate = cookies[SESSION_COOKIE_NAME];
  if (candidate && SAFE_SESSION_ID_RE.test(candidate)) {
    return candidate;
  }
  return null;
}

export function getOrCreateSession(request: Request): {
  sessionId: string;
  isNew: boolean;
} {
  const existing = readSessionIdFromRequest(request);
  if (existing) {
    return { sessionId: existing, isNew: false };
  }
  return {
    sessionId: randomBytes(18).toString("base64url"),
    isNew: true,
  };
}

export function buildSessionSetCookieHeader(sessionId: string): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=86400",
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Verifies same-origin when Origin and Host headers are present on state-changing requests.
 */
export function verifySameOriginRequest(request: Request): { ok: boolean; error?: StructuredAnalysisError } {
  const origin = request.headers.get("origin");
  if (!origin) {
    return { ok: true };
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (!host) {
    return { ok: true };
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    if (originHost !== host.toLowerCase()) {
      return {
        ok: false,
        error: {
          category: "unauthorized",
          code: "CROSS_ORIGIN_FORBIDDEN",
          title: "Cross-origin submission rejected",
          message: "Skin analysis requests must originate from the Dew & Form application.",
        },
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: {
        category: "unauthorized",
        code: "INVALID_ORIGIN_HEADER",
        title: "Invalid request origin",
        message: "Malformed Origin header in skin analysis submission.",
      },
    };
  }
}

export interface SignedTaskPayload {
  v: 1;
  sid: string;
  tid: string;
  ref: string;
  mode: AnalysisMode;
  act: YouCamDstAction[];
  iat: number;
  exp: number;
}

export function isValidProviderTaskId(providerTaskId: unknown): providerTaskId is string {
  return (
    typeof providerTaskId === "string" &&
    SAFE_PROVIDER_TASK_ID_RE.test(providerTaskId) &&
    !providerTaskId.includes("..")
  );
}

/**
 * Issues a cryptographically signed, session-bound opaque task token so clients
 * never hold raw YouCam task IDs and cannot poll tasks belonging to other sessions.
 */
export function issueSessionBoundTaskToken(params: {
  sessionId: string;
  providerTaskId: string;
  mode: AnalysisMode;
  requestedActions: YouCamDstAction[];
  ttlSeconds?: number;
}): { token: string; publicRef: string } {
  if (!isValidProviderTaskId(params.providerTaskId)) {
    throw new Error("Invalid upstream task identifier format.");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = params.ttlSeconds ?? 24 * 60 * 60;
  const publicRef = `tsk_${createHash("sha256")
    .update(`${params.sessionId}:${params.providerTaskId}:${nowSec}`)
    .digest("hex")
    .slice(0, 10)}`;

  const payload: SignedTaskPayload = {
    v: 1,
    sid: params.sessionId,
    tid: params.providerTaskId,
    ref: publicRef,
    mode: params.mode,
    act: params.requestedActions,
    iat: nowSec,
    exp: nowSec + ttl,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSigningKey())
    .update(`dft1.${encodedPayload}`)
    .digest("base64url");

  return {
    token: `dft1.${encodedPayload}.${signature}`,
    publicRef,
  };
}

export type VerifyTaskTokenResult =
  | {
      ok: true;
      payload: SignedTaskPayload;
    }
  | {
      ok: false;
      httpStatus: 400 | 403 | 410;
      error: StructuredAnalysisError;
    };

export function verifySessionBoundTaskToken(
  token: string,
  currentSessionId: string | null
): VerifyTaskTokenResult {
  if (!token || typeof token !== "string" || token.length > 1400 || !token.startsWith("dft1.")) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        category: "validation",
        code: "INVALID_TASK_ID",
        title: "Invalid analysis task identifier",
        message: "The supplied task identifier is malformed or unrecognized.",
      },
    };
  }

  const segments = token.split(".");
  if (segments.length !== 3 || segments[0] !== "dft1" || !segments[1] || !segments[2]) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        category: "validation",
        code: "INVALID_TASK_ID",
        title: "Invalid analysis task identifier",
        message: "The supplied task identifier could not be verified.",
      },
    };
  }

  const [, encodedPayload, providedSig] = segments;
  const expectedSigBuf = createHmac("sha256", getSigningKey())
    .update(`dft1.${encodedPayload}`)
    .digest();

  let providedSigBuf: Buffer;
  try {
    providedSigBuf = Buffer.from(providedSig, "base64url");
  } catch {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        category: "validation",
        code: "INVALID_TASK_ID",
        title: "Invalid analysis task identifier",
        message: "The supplied task signature is malformed.",
      },
    };
  }

  if (
    providedSigBuf.byteLength !== expectedSigBuf.byteLength ||
    !timingSafeEqual(providedSigBuf, expectedSigBuf)
  ) {
    return {
      ok: false,
      httpStatus: 403,
      error: {
        category: "unauthorized",
        code: "INVALID_TASK_SIGNATURE",
        title: "Unauthorized task identifier",
        message: "This analysis task token is invalid or does not belong to the active server session.",
      },
    };
  }

  let parsed: SignedTaskPayload;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SignedTaskPayload;
  } catch {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        category: "validation",
        code: "INVALID_TASK_ID",
        title: "Invalid analysis task payload",
        message: "Could not decode task metadata.",
      },
    };
  }

  if (
    parsed.v !== 1 ||
    !isValidProviderTaskId(parsed.tid) ||
    typeof parsed.sid !== "string" ||
    typeof parsed.exp !== "number"
  ) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        category: "validation",
        code: "INVALID_TASK_ID",
        title: "Invalid analysis task metadata",
        message: "Task metadata failed structural validation.",
      },
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.exp <= nowSec) {
    return {
      ok: false,
      httpStatus: 410,
      error: {
        category: "expired",
        code: "TASK_TOKEN_EXPIRED",
        title: "Analysis session has expired",
        message: "This skin analysis task reference has expired. Please start a new analysis.",
      },
    };
  }

  if (!currentSessionId || parsed.sid !== currentSessionId) {
    return {
      ok: false,
      httpStatus: 403,
      error: {
        category: "unauthorized",
        code: "TASK_OWNERSHIP_MISMATCH",
        title: "Task belongs to a different browser session",
        message:
          "For your privacy, skin analysis tasks can only be accessed by the browser session that submitted the portrait.",
      },
    };
  }

  return {
    ok: true,
    payload: parsed,
  };
}

interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();

export type RateLimitScope = "create_task" | "poll_task";

const RATE_LIMIT_RULES: Record<RateLimitScope, { maxRequests: number; windowMs: number }> = {
  create_task: { maxRequests: 6, windowMs: 5 * 60 * 1000 }, // 6 new tasks per 5 min per client
  poll_task: { maxRequests: 60, windowMs: 5 * 60 * 1000 }, // 60 status checks per 5 min per client
};

export function extractClientRateKey(request: Request, sessionId: string | null): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const realIp = request.headers.get("x-real-ip")?.trim() || "";
  const ip = forwardedFor || realIp || "local";
  return `${sessionId || "anon"}:${ip}`;
}

export function enforceRateLimit(
  scope: RateLimitScope,
  clientKey: string,
  nowMs: number = Date.now()
): { allowed: true } | { allowed: false; retryAfterSeconds: number; error: StructuredAnalysisError } {
  const rule = RATE_LIMIT_RULES[scope];
  const bucketKey = `${scope}:${clientKey}`;
  const cutoff = nowMs - rule.windowMs;

  if (rateBuckets.size > 2000) {
    for (const [k, b] of rateBuckets.entries()) {
      const recent = b.timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        rateBuckets.delete(k);
      } else {
        b.timestamps = recent;
      }
    }
  }

  const existing = rateBuckets.get(bucketKey);
  const recent = existing ? existing.timestamps.filter((t) => t > cutoff) : [];

  if (recent.length >= rule.maxRequests) {
    const oldestInWindow = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + rule.windowMs - nowMs) / 1000));
    rateBuckets.set(bucketKey, { timestamps: recent });
    return {
      allowed: false,
      retryAfterSeconds,
      error: {
        category: "rate_limited",
        code: "LOCAL_RATE_LIMITED",
        title: "Too many analysis requests",
        message:
          scope === "create_task"
            ? "To protect API quota, please wait briefly before starting another skin analysis."
            : "Status checks are being sent too rapidly. Please wait a moment before polling again.",
        retryAfterSeconds,
      },
    };
  }

  recent.push(nowMs);
  rateBuckets.set(bucketKey, { timestamps: recent });
  return { allowed: true };
}

export function resetRateLimitsForTests(): void {
  rateBuckets.clear();
}

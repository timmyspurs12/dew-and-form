import { NextRequest, NextResponse } from "next/server";
import { extractProductFromExternalUrl } from "@/lib/product-check/url-extractor";
import {
  enforceRateLimit,
  extractClientRateKey,
  readSessionIdFromRequest,
  verifySameOriginRequest,
} from "@/lib/youcam/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const originCheck = verifySameOriginRequest(request);
  if (!originCheck.ok) {
    return NextResponse.json(
      {
        ok: false,
        extractionStatus: "blocked_or_unreachable",
        provenance: "unverified-url",
        message: originCheck.error?.message || "Cross-origin request rejected.",
        product: null,
      },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const sessionId = readSessionIdFromRequest(request);
  const clientKey = extractClientRateKey(request, sessionId);
  const limit = enforceRateLimit("product_url_extract", clientKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        extractionStatus: "blocked_or_unreachable",
        provenance: "unverified-url",
        message: "Too many URL inspection requests. Please wait a moment or paste the INCI list directly.",
        product: null,
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(limit.retryAfterSeconds),
        },
      }
    );
  }

  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json(
      {
        ok: false,
        extractionStatus: "blocked_or_unreachable",
        provenance: "unverified-url",
        message: "Invalid JSON request body.",
        product: null,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rawUrl = typeof body.url === "string" ? body.url : "";
  const result = await extractProductFromExternalUrl(rawUrl);

  return NextResponse.json(result.body, {
    status: result.httpStatus,
    headers: { "Cache-Control": "no-store" },
  });
}

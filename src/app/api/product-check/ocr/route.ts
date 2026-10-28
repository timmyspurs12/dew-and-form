import { NextRequest, NextResponse } from "next/server";
import { inspectImageBuffer } from "@/lib/youcam/image-inspector";
import {
  enforceRateLimit,
  extractClientRateKey,
  readSessionIdFromRequest,
  verifySameOriginRequest,
} from "@/lib/youcam/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LABEL_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Label Photo Validation & OCR Integration Boundary (`POST /api/product-check/ocr`).
 *
 * - Validates binary JPEG/PNG magic bytes (`inspectImageBuffer`) and file size in memory.
 * - Never writes uploaded label photos to persistent storage.
 * - Checks `PRODUCT_LABEL_OCR_ENDPOINT` and `PRODUCT_LABEL_OCR_API_KEY`:
 *   When not configured, transparently reports the integration boundary without fabricating
 *   extracted product names or INCI lists, allowing the client to present the side-by-side
 *   zoom loupe for manual verification.
 */
export async function POST(request: NextRequest) {
  const originCheck = verifySameOriginRequest(request);
  if (!originCheck.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "CROSS_ORIGIN_FORBIDDEN",
        message: originCheck.error?.message || "Cross-origin submission rejected.",
      },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_CONTENT_TYPE",
        message: "Expected multipart/form-data upload containing 'inciImage'.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const sessionId = readSessionIdFromRequest(request);
  const clientKey = extractClientRateKey(request, sessionId);
  const limit = enforceRateLimit("product_label_ocr", clientKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many label photo uploads in a brief window. Please wait a moment.",
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "MALFORMED_FORM_DATA",
        message: "Could not parse uploaded label image form data.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const inciEntry = formData.get("inciImage");
  if (!inciEntry || typeof inciEntry === "string") {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_INCI_IMAGE",
        message: "Please select a JPEG or PNG photograph of the product's ingredient list.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (inciEntry.size > MAX_LABEL_IMAGE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        code: "FILE_TOO_LARGE",
        message: "Label photograph exceeds the 10 MB maximum file size.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const inciBytes = new Uint8Array(await inciEntry.arrayBuffer());
  const inciInspection = inspectImageBuffer(inciBytes);
  if (!inciInspection.valid) {
    return NextResponse.json(
      {
        ok: false,
        code: inciInspection.code,
        message: inciInspection.message,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  let validatedFront: { mimeType: string; width: number; height: number } | null = null;
  const frontEntry = formData.get("frontImage");
  if (frontEntry && typeof frontEntry !== "string" && frontEntry.size > 0) {
    if (frontEntry.size > MAX_LABEL_IMAGE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          code: "FILE_TOO_LARGE",
          message: "Front label photograph exceeds the 10 MB maximum file size.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const frontBytes = new Uint8Array(await frontEntry.arrayBuffer());
    const frontInspection = inspectImageBuffer(frontBytes);
    if (!frontInspection.valid) {
      return NextResponse.json(
        {
          ok: false,
          code: frontInspection.code,
          message: `Front label image invalid: ${frontInspection.message}`,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    validatedFront = {
      mimeType: frontInspection.mimeType,
      width: frontInspection.width,
      height: frontInspection.height,
    };
  }

  const ocrEndpoint = process.env.PRODUCT_LABEL_OCR_ENDPOINT?.trim();
  const ocrApiKey = process.env.PRODUCT_LABEL_OCR_API_KEY?.trim();

  if (!ocrEndpoint || !ocrApiKey) {
    return NextResponse.json(
      {
        ok: true,
        ocrConfigured: false,
        status: "manual_transcription_ready",
        requiredEnv: ["PRODUCT_LABEL_OCR_ENDPOINT", "PRODUCT_LABEL_OCR_API_KEY"],
        validatedImages: {
          inciImage: {
            mimeType: inciInspection.mimeType,
            width: inciInspection.width,
            height: inciInspection.height,
          },
          frontImage: validatedFront,
        },
        extracted: null,
        message:
          "Label photograph passed binary JPEG/PNG validation. Automated text-extraction OCR is not configured in this environment (requires PRODUCT_LABEL_OCR_ENDPOINT and PRODUCT_LABEL_OCR_API_KEY)—use the side-by-side zoom loupe below to transcribe or verify the INCI list directly without fabricated OCR guesses.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Configured external OCR provider integration boundary
  try {
    const upstreamForm = new FormData();
    upstreamForm.append(
      "inciImage",
      new Blob([inciBytes], { type: inciInspection.mimeType }),
      "inci-label.jpg"
    );

    const upstreamRes = await fetch(ocrEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ocrApiKey}`,
        Accept: "application/json",
      },
      body: upstreamForm,
      signal: AbortSignal.timeout(12_000),
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          ok: true,
          ocrConfigured: true,
          status: "ocr_upstream_unavailable",
          validatedImages: {
            inciImage: {
              mimeType: inciInspection.mimeType,
              width: inciInspection.width,
              height: inciInspection.height,
            },
            frontImage: validatedFront,
          },
          extracted: null,
          message:
            "Label image is valid, but the configured OCR service did not return a text transcript. Please transcribe or edit the INCI list manually below.",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const payload = (await upstreamRes.json()) as {
      productName?: string;
      brand?: string;
      inciDeclaration?: string;
    };

    return NextResponse.json(
      {
        ok: true,
        ocrConfigured: true,
        status: "ocr_extracted",
        validatedImages: {
          inciImage: {
            mimeType: inciInspection.mimeType,
            width: inciInspection.width,
            height: inciInspection.height,
          },
          frontImage: validatedFront,
        },
        extracted: {
          productName: typeof payload.productName === "string" ? payload.productName : "",
          brand: typeof payload.brand === "string" ? payload.brand : "",
          inciDeclaration:
            typeof payload.inciDeclaration === "string" ? payload.inciDeclaration : "",
        },
        message:
          "OCR transcript generated—carefully check spelling against your label photo before running Product Check.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        ok: true,
        ocrConfigured: true,
        status: "ocr_upstream_unavailable",
        validatedImages: {
          inciImage: {
            mimeType: inciInspection.mimeType,
            width: inciInspection.width,
            height: inciInspection.height,
          },
          frontImage: validatedFront,
        },
        extracted: null,
        message:
          "Could not reach the configured OCR endpoint. Use your label photo preview below to enter the INCI list manually.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

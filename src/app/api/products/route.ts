import { NextRequest, NextResponse } from "next/server";
import { fetchOpenBeautyFactsProducts } from "@/lib/ingredients/open-beauty-facts";
import {
  enforceRateLimit,
  extractClientRateKey,
  readSessionIdFromRequest,
} from "@/lib/youcam/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Product & INCI Registry Endpoint (`GET /api/products` & `GET /api/products?q=...`).
 *
 * Connects server-side to the public Open Beauty Facts database (ODbL) to return
 * verified cosmetic products and packaging INCI declarations:
 * - Zero fabricated prices (`price: null` on non-commercial open INCI records)
 * - Zero fabricated ratings, stock badges, or compatibility scores
 * - Supports default facial skincare discovery and live keyword / EAN-UPC barcode search
 * - Degrades gracefully (`connected: false`) if upstream is unreachable
 */
export async function GET(request: NextRequest) {
  const sessionId = readSessionIdFromRequest(request);
  const clientKey = extractClientRateKey(request, sessionId);
  const limit = enforceRateLimit("products_search", clientKey);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        connected: false,
        source: "rate-limited",
        query: null,
        products: [],
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

  const rawQuery = request.nextUrl.searchParams.get("q");
  const result = await fetchOpenBeautyFactsProducts(rawQuery);

  return NextResponse.json(
    {
      connected: result.connected,
      source: result.source,
      attribution: "Open Beauty Facts (ODbL)",
      query: result.query,
      products: result.products,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": result.connected
          ? "public, s-maxage=900, stale-while-revalidate=3600"
          : "no-store",
      },
    }
  );
}

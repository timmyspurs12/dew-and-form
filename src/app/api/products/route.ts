import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Product Discovery Feed Endpoint.
 * Returns genuine retail catalogue data when connected via environment/CMS feed.
 * Never fabricates brands, prices, stock, reviews, ratings, or external store links.
 */
export async function GET() {
  return NextResponse.json({
    connected: false,
    source: "unconnected",
    products: [],
  });
}

// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseInciDeclaration } from "@/lib/ingredients/catalog";
import {
  normalizeOpenBeautyFactsRecord,
  resetOpenBeautyFactsCacheForTests,
} from "@/lib/ingredients/open-beauty-facts";
import { resetRateLimitsForTests } from "@/lib/youcam/security";
import { composeRoutineBlueprint } from "@/lib/youcam/metadata";
import { GET as getProductsRoute } from "@/app/api/products/route";

describe("Open Beauty Facts INCI normalization & /api/products route", () => {
  beforeEach(() => {
    resetOpenBeautyFactsCacheForTests();
    resetRateLimitsForTests();
    vi.restoreAllMocks();
  });

  it("parses European hyphen-separated INCI declarations, preserves numeric chemical locants, and strips F.I.L. boilerplate", () => {
    const commaWithLocant =
      "Aqua/Water/Eau, Glycerin, 1,2-Hexanediol, Niacinamide, Panthenol, Phenoxyethanol. Please be aware that ingredient lists may change.";
    const parsedComma = parseInciDeclaration(commaWithLocant);
    expect(parsedComma.map((i) => i.rawLabel)).toEqual([
      "Aqua/Water/Eau",
      "Glycerin",
      "1,2-Hexanediol",
      "Niacinamide",
      "Panthenol",
      "Phenoxyethanol",
    ]);
    expect(parsedComma[0].monograph?.id).toBe("aqua");
    expect(parsedComma[3].monograph?.id).toBe("niacinamide");

    const dashSeparated =
      "AQUA / WATER - GLYCERIN - NIACINAMIDE - CERAMIDE NP - SQUALANE - TOCOPHEROL (F.I.L. Z280823/1)";
    const parsedDash = parseInciDeclaration(dashSeparated);
    expect(parsedDash.map((i) => i.rawLabel)).toEqual([
      "AQUA / WATER",
      "GLYCERIN",
      "NIACINAMIDE",
      "CERAMIDE NP",
      "SQUALANE",
      "TOCOPHEROL",
    ]);
    expect(parsedDash[3].monograph?.id).toBe("ceramide-np");
  });

  it("normalizes verified facial skincare records honestly with null price and rejects off-category or incomplete stubs", () => {
    const validSerum = normalizeOpenBeautyFactsRecord({
      code: "0769915233506",
      product_name: "Hyaluronic Acid 2% + B5",
      brands: "The Ordinary, DECIEM",
      categories: "Facial care, Serums",
      categories_tags: ["en:facial-care", "en:serums"],
      quantity: "30 ml",
      image_front_url:
        "https://images.openbeautyfacts.org/images/products/076/991/523/3506/front_en.jpg",
      url: "https://world.openbeautyfacts.org/product/0769915233506/hyaluronic-acid-2-b5-the-ordinary",
      ingredients_text:
        "Aqua (Water), Sodium Hyaluronate, Pentylene Glycol, Propanediol, Panthenol, Citric Acid, Phenoxyethanol, Chlorphenesin",
    });

    expect(validSerum).not.toBeNull();
    expect(validSerum?.sourceKind).toBe("open-beauty-facts");
    expect(validSerum?.brand).toBe("The Ordinary");
    expect(validSerum?.price).toBeNull();
    expect(validSerum?.barcode).toBe("0769915233506");
    expect(validSerum?.category).toBe("Hydrating Serum");
    expect(validSerum?.attributes).toContain("Fragrance-free");
    expect(validSerum?.keyIngredients).toContain("Sodium Hyaluronate");
    expect(validSerum?.keyIngredients).toContain("Panthenol");

    // Rejects hair shampoo records from facial skincare feed
    const shampoo = normalizeOpenBeautyFactsRecord({
      code: "3600523951234",
      product_name: "Ultra Doux Shampooing Ceramide",
      brands: "Garnier",
      categories: "Hair care, Shampoos",
      ingredients_text:
        "Aqua, Sodium Laureth Sulfate, Coco-Betaine, Glycerin, Parfum, Limonene, Citric Acid",
    });
    expect(shampoo).toBeNull();

    // Rejects incomplete 1-token crowd-sourced stubs
    const stub = normalizeOpenBeautyFactsRecord({
      code: "3337875597357",
      product_name: "Stub Cream",
      brands: "BrandX",
      categories: "Face creams",
      ingredients_text: "ceramides",
    });
    expect(stub).toBeNull();
  });

  it("serves GET /api/products keyword search and barcode lookup via Open Beauty Facts and degrades cleanly when offline", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/v2/product/0769915233506.json")) {
        return new Response(
          JSON.stringify({
            status: 1,
            product: {
              code: "0769915233506",
              product_name: "Hyaluronic Acid 2% + B5",
              brands: "The Ordinary",
              categories: "Facial serums",
              quantity: "30 ml",
              ingredients_text:
                "Aqua, Sodium Hyaluronate, Propanediol, Panthenol, Citric Acid, Phenoxyethanol",
            },
          }),
          { status: 200 }
        );
      }

      if (url.includes("search_terms=niacinamide")) {
        return new Response(
          JSON.stringify({
            products: [
              {
                code: "3701154701160",
                product_name: "Salicylic Acid + Niacinamide Serum",
                brands: "Horace",
                categories: "Face serums",
                quantity: "30 ml",
                ingredients_text:
                  "Aqua, Propanediol, Niacinamide, Glycerin, Salicylic Acid, Zinc PCA, Phenoxyethanol",
              },
            ],
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ products: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    const searchReq = new NextRequest("http://localhost:3000/api/products?q=niacinamide");
    const searchRes = await getProductsRoute(searchReq);
    const searchJson = (await searchRes.json()) as {
      connected: boolean;
      source: string;
      query: string;
      products: Array<{ name: string; price: null; attributes: string[] }>;
    };

    expect(searchRes.status).toBe(200);
    expect(searchJson.connected).toBe(true);
    expect(searchJson.source).toBe("open-beauty-facts");
    expect(searchJson.query).toBe("niacinamide");
    expect(searchJson.products).toHaveLength(1);
    expect(searchJson.products[0].name).toBe("Salicylic Acid + Niacinamide Serum");
    expect(searchJson.products[0].price).toBeNull();
    expect(searchJson.products[0].attributes).toContain("Contains exfoliating acid");

    // Barcode lookup
    const barcodeReq = new NextRequest("http://localhost:3000/api/products?q=0769915233506");
    const barcodeRes = await getProductsRoute(barcodeReq);
    const barcodeJson = (await barcodeRes.json()) as {
      connected: boolean;
      products: Array<{ barcode: string; brand: string }>;
    };
    expect(barcodeJson.connected).toBe(true);
    expect(barcodeJson.products[0].barcode).toBe("0769915233506");
    expect(barcodeJson.products[0].brand).toBe("The Ordinary");

    // Graceful offline degradation
    resetOpenBeautyFactsCacheForTests();
    global.fetch = vi.fn(async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    const offlineReq = new NextRequest("http://localhost:3000/api/products");
    const offlineRes = await getProductsRoute(offlineReq);
    const offlineJson = (await offlineRes.json()) as {
      connected: boolean;
      source: string;
      products: unknown[];
    };
    expect(offlineRes.status).toBe(200);
    expect(offlineJson.connected).toBe(false);
    expect(offlineJson.source).toBe("unavailable");
    expect(offlineJson.products).toEqual([]);
  });

  it("composes conflict-aware AM/PM routine steps and fetches theme-tailored Open Beauty Facts formulations via ?themes=", async () => {
    const blueprint = composeRoutineBlueprint([
      "sebum-pore-refinement",
      "well-ageing-support",
    ]);
    expect(blueprint.morningSteps).toHaveLength(4);
    expect(blueprint.eveningSteps).toHaveLength(3);
    expect(blueprint.eveningSteps[1].cadenceBadge).toBe("Alternate nights · Never stack");
    expect(
      blueprint.layeringCautions.some((note) =>
        note.includes("Separate exfoliating acids")
      )
    ).toBe(true);

    const requestedUrls: string[] = [];
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      requestedUrls.push(url);
      if (url.includes("ingredients_tags=en%3Asalicylic-acid")) {
        return new Response(
          JSON.stringify({
            products: [
              {
                code: "3337875784054",
                product_name: "Blemish Control Cleanser",
                brands: "CeraVe",
                categories: "Face cleansers",
                ingredients_text:
                  "Aqua, Cocamidopropyl Hydroxysultaine, Glycerin, Niacinamide, Salicylic Acid, Ceramide NP, Cholesterol, Citric Acid",
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ products: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    const themeReq = new NextRequest(
      "http://localhost:3000/api/products?themes=sebum-pore-refinement"
    );
    const themeRes = await getProductsRoute(themeReq);
    const themeJson = (await themeRes.json()) as {
      connected: boolean;
      themes: string[];
      products: Array<{ name: string; focusThemes: string[] }>;
    };

    expect(themeRes.status).toBe(200);
    expect(themeJson.connected).toBe(true);
    expect(themeJson.themes).toEqual(["sebum-pore-refinement"]);
    expect(requestedUrls.some((u) => u.includes("en%3Asalicylic-acid"))).toBe(true);
    expect(themeJson.products[0].name).toBe("Blemish Control Cleanser");
    expect(themeJson.products[0].focusThemes).toContain("sebum-pore-refinement");
  });
});

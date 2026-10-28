import "server-only";
import {
  CARE_THEME_METADATA,
  isValidCareFocusTheme,
  type CareFocusTheme,
} from "@/lib/youcam/metadata";
import { cleanRawInciText, isFeaturedKeyMonograph, parseInciDeclaration } from "./catalog";
import type {
  FormulationAttribute,
  FormulationCategory,
  SkincareProduct,
} from "./types";

const DEFAULT_OBF_BASE_URL = "https://world.openbeautyfacts.org";
const OBF_USER_AGENT = "DewAndForm/1.0 (+https://github.com/timmyspurs12/dew-and-form)";
const OBF_FIELDS =
  "code,product_name,product_name_en,brands,categories,categories_tags,ingredients_text,ingredients_text_en,image_front_url,quantity,url";
const OBF_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface RawOpenBeautyFactsProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  ingredients_text?: string;
  ingredients_text_en?: string;
  image_front_url?: string;
  quantity?: string;
  url?: string;
}

const NON_FACIAL_CATEGORY_RE =
  /\b(shampoos?|hair[- ]care|hair[- ]serums?|conditioners?|deodorants?|toothpastes?|mouthwash|nail|lipsticks?|lip[- ]balms?|mascaras?|eyeliners?|eau de toilette|eau de parfum|shower gels?|hand creams?|hand superfood|foot|toallitas|baby wipes)\b/i;

const FRAGRANCE_MARKER_RE =
  /\b(parfum|fragrance|aroma|limonene|linalool|citronellol|geraniol|eugenol|citral|coumarin|hexyl cinnamal|benzyl salicylate|alpha-isomethyl ionone|hydroxycitronellal|cinnamyl alcohol)\b/i;

const ESSENTIAL_OIL_MARKER_RE =
  /\b(lavandula|mentha piperita|peppermint|eucalyptus|melaleuca|tea tree|rosmarinus|rosemary|citrus\s+\w+\s+(?:peel\s+)?oil|bergamot|ylang)\b/i;

const DENAT_ALCOHOL_RE =
  /\b(alcohol denat\.?|denatured alcohol|sd alcohol|isopropyl alcohol)\b/i;

const EXFOLIATING_ACID_RE =
  /\b(salicylic acid|glycolic acid|lactic acid|mandelic acid|gluconolactone|lactobionic acid)\b/i;

const RETINOID_RE =
  /\b(retinol|retinal|retinaldehyde|retinyl palmitate|hydroxypinacolone retinoate)\b/i;

function sanitizeExternalImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "images.openbeautyfacts.org" ||
        parsed.hostname === "static.openbeautyfacts.org")
    ) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeSourceUrl(raw: unknown, code: string): string {
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = new URL(raw.trim());
      if (parsed.protocol === "https:" && parsed.hostname.endsWith("openbeautyfacts.org")) {
        return parsed.toString();
      }
    } catch {
      // fall through
    }
  }
  return `https://world.openbeautyfacts.org/product/${encodeURIComponent(code)}`;
}

function inferCategory(name: string, categoriesBlob: string): FormulationCategory {
  const combined = `${name} ${categoriesBlob}`.toLowerCase();

  if (/\b(sunscreens?|spf\s*\d+|suncare|solaires?|uv\b|sunblocks?)\b/.test(combined)) {
    return "Sunscreen";
  }
  if (
    /\b(cleansers?|cleansing|micellar|face wash|gel wash|foam wash|nettoyants?)\b/.test(combined)
  ) {
    return "Cleanser";
  }
  if (/\b(toners?|essences?|lotions?\s+toniques?|mists?)\b/.test(combined)) {
    return "Toner & Essence";
  }
  if (/\b(serums?|sérums?|ampoules?|boosters?|concentrates?|drops)\b/.test(combined)) {
    if (/\b(salicylic|azelaic|retinol|niacinamide|vitamin c|aha|bha|spot|blemish)\b/.test(combined)) {
      return "Targeted Treatment";
    }
    return "Hydrating Serum";
  }
  if (/\b(treatments?|peels?|exfoliants?|retinol|azelaic)\b/.test(combined)) {
    return "Targeted Treatment";
  }
  return "Moisturiser & Barrier Cream";
}

function deriveAttributesFromInci(
  cleanedInci: string,
  category: FormulationCategory
): FormulationAttribute[] {
  const attrs: FormulationAttribute[] = [];

  if (FRAGRANCE_MARKER_RE.test(cleanedInci)) {
    attrs.push("Contains fragrance");
  } else {
    attrs.push("Fragrance-free");
  }

  if (!ESSENTIAL_OIL_MARKER_RE.test(cleanedInci)) {
    attrs.push("Essential-oil-free");
  }

  if (!DENAT_ALCOHOL_RE.test(cleanedInci)) {
    attrs.push("Denatured-alcohol-free");
  }

  attrs.push(category === "Cleanser" ? "Rinse-off" : "Leave-on");

  if (EXFOLIATING_ACID_RE.test(cleanedInci)) {
    attrs.push("Contains exfoliating acid");
  }

  if (RETINOID_RE.test(cleanedInci)) {
    attrs.push("Contains retinoid");
  }

  return attrs;
}

/**
 * Normalizes a raw Open Beauty Facts record into a Dew & Form `SkincareProduct`
 * only when genuine product name, brand, and multi-ingredient INCI declaration exist.
 * Never fabricates prices, ratings, or commercial stock claims.
 */
export function normalizeOpenBeautyFactsRecord(
  raw: RawOpenBeautyFactsProduct,
  options?: { allowBroadCategory?: boolean; minInciTokens?: number }
): SkincareProduct | null {
  const code = typeof raw.code === "string" ? raw.code.trim() : "";
  if (!code || !/^\d{6,16}$/.test(code)) {
    return null;
  }

  const rawName = (raw.product_name_en?.trim() || raw.product_name?.trim() || "").replace(
    /\s+/g,
    " "
  );
  const rawBrand = (raw.brands || "")
    .split(",")[0]
    ?.trim()
    .replace(/\s+/g, " ");

  if (!rawName || rawName.length < 3 || !rawBrand || rawBrand.length < 2) {
    return null;
  }

  const categoriesBlob = [raw.categories || "", ...(raw.categories_tags || [])].join(" ");
  if (!options?.allowBroadCategory && NON_FACIAL_CATEGORY_RE.test(`${rawName} ${categoriesBlob}`)) {
    return null;
  }

  const rawInci = raw.ingredients_text_en?.trim() || raw.ingredients_text?.trim() || "";
  const cleanedInci = cleanRawInciText(rawInci);
  if (!cleanedInci || cleanedInci.length < 20) {
    return null;
  }

  const parsedIngredients = parseInciDeclaration(cleanedInci);
  const minTokens = options?.minInciTokens ?? 4;
  if (parsedIngredients.length < minTokens) {
    return null;
  }

  // Extract unique documented CosIng/CIR key ingredients (excluding plain solvent/preservative/caution-only entries)
  type MatchedMono = NonNullable<(typeof parsedIngredients)[number]["monograph"]>;
  const matchedMonographs = Array.from(
    new Map(
      parsedIngredients
        .map((item) => item.monograph)
        .filter((m): m is MatchedMono => m !== null && isFeaturedKeyMonograph(m))
        .map((m) => [m.id, m] as const)
    ).values()
  );

  const keyIngredients = matchedMonographs.slice(0, 6).map((m) => m.commonName.split(" (")[0]);

  const category = inferCategory(rawName, categoriesBlob);
  const attributes = deriveAttributesFromInci(cleanedInci, category);

  const derivedThemes = Array.from(
    new Set<CareFocusTheme>(matchedMonographs.flatMap((m) => m.relatedThemes))
  );
  if (derivedThemes.length === 0) {
    if (category === "Hydrating Serum" || category === "Moisturiser & Barrier Cream") {
      derivedThemes.push("hydration-support");
    } else if (category === "Cleanser") {
      derivedThemes.push("gentle-soothing");
    } else if (category === "Sunscreen") {
      derivedThemes.push("tone-luminosity");
    }
  }

  const sizeLabel =
    typeof raw.quantity === "string" && raw.quantity.trim().length > 0 && raw.quantity.length <= 24
      ? raw.quantity.trim()
      : null;

  const surfacedReason =
    keyIngredients.length > 0
      ? `Public packaging INCI declaration (${parsedIngredients.length} listed ingredients) featuring ${keyIngredients.slice(0, 3).join(", ")}.`
      : `Public packaging INCI declaration (${parsedIngredients.length} listed ingredients) recorded in Open Beauty Facts.`;

  return {
    id: `obf-${code}`,
    sourceKind: "open-beauty-facts",
    name: rawName,
    brand: rawBrand,
    category,
    price: null,
    sizeLabel,
    imageUrl: sanitizeExternalImageUrl(raw.image_front_url),
    barcode: code,
    sourceUrl: sanitizeSourceUrl(raw.url, code),
    inciDeclaration: cleanedInci,
    keyIngredients,
    attributes,
    focusThemes: derivedThemes,
    surfacedReason,
  };
}

interface CacheEntry {
  expiresAt: number;
  products: SkincareProduct[];
}

const catalogCache = new Map<string, CacheEntry>();

function getObfBaseUrl(): string {
  return (process.env.OPEN_BEAUTY_FACTS_BASE_URL?.trim() || DEFAULT_OBF_BASE_URL).replace(
    /\/+$/,
    ""
  );
}

async function fetchObfJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": OBF_USER_AGENT,
    },
    signal: AbortSignal.timeout(OBF_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Open Beauty Facts HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export interface OpenBeautyFactsFeedResult {
  connected: boolean;
  source: "open-beauty-facts" | "unavailable";
  query: string | null;
  themes: CareFocusTheme[];
  products: SkincareProduct[];
}

export function parseThemesParam(rawThemes: string | null | undefined): CareFocusTheme[] {
  if (!rawThemes) return [];
  return Array.from(
    new Set(
      rawThemes
        .split(",")
        .map((part) => part.trim())
        .filter(isValidCareFocusTheme)
    )
  ).slice(0, 6);
}

/**
 * Queries real skincare products and packaging INCI declarations from Open Beauty Facts (ODbL).
 * Supports default curated facial-care discovery, theme-targeted discovery (`themes`),
 * and live keyword / EAN-UPC barcode search (`rawQuery`).
 */
export async function fetchOpenBeautyFactsProducts(
  rawQuery?: string | null,
  themes: CareFocusTheme[] = []
): Promise<OpenBeautyFactsFeedResult> {
  const query = rawQuery?.trim().slice(0, 80) || "";
  const sortedThemeKey = [...themes].sort().join(",");
  const cacheKey = query
    ? `q:${query.toLowerCase()}`
    : sortedThemeKey
      ? `themes:${sortedThemeKey}`
      : "default:facial-skincare";
  const now = Date.now();

  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      connected: true,
      source: "open-beauty-facts",
      query: query || null,
      themes,
      products: cached.products,
    };
  }

  const baseUrl = getObfBaseUrl();

  try {
    let normalized: SkincareProduct[] = [];

    if (query && /^\d{8,14}$/.test(query)) {
      // Exact EAN/UPC barcode lookup via v2 product endpoint
      const data = await fetchObfJson<{
        status?: number;
        product?: RawOpenBeautyFactsProduct;
      }>(`${baseUrl}/api/v2/product/${encodeURIComponent(query)}.json?fields=${OBF_FIELDS}`);

      if (data?.status === 1 && data.product) {
        const single = normalizeOpenBeautyFactsRecord(
          { ...data.product, code: data.product.code || query },
          { allowBroadCategory: true, minInciTokens: 2 }
        );
        if (single) {
          normalized = [single];
        }
      }
    } else if (query) {
      // Keyword / brand / ingredient search
      const searchUrl = `${baseUrl}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=24&fields=${OBF_FIELDS}`;
      const data = await fetchObfJson<{ products?: RawOpenBeautyFactsProduct[] }>(searchUrl);

      const seenCodes = new Set<string>();
      for (const item of data.products || []) {
        const product = normalizeOpenBeautyFactsRecord(item, {
          allowBroadCategory: false,
          minInciTokens: 3,
        });
        if (product && product.barcode && !seenCodes.has(product.barcode)) {
          seenCodes.add(product.barcode);
          normalized.push(product);
        }
        if (normalized.length >= 15) break;
      }
    } else {
      // Theme-tailored or default facial skincare discovery feed via fast indexed v2 queries
      const themeTags = Array.from(
        new Set(themes.flatMap((t) => CARE_THEME_METADATA[t]?.obfIngredientTags ?? []))
      ).slice(0, 4);

      const endpoints =
        themeTags.length > 0
          ? [
              ...themeTags.map(
                (tag) =>
                  `${baseUrl}/api/v2/search?ingredients_tags=${encodeURIComponent(tag)}&fields=${OBF_FIELDS}&page_size=14&sort_by=unique_scans_n`
              ),
              `${baseUrl}/api/v2/search?categories_tags=en:face-creams&fields=${OBF_FIELDS}&page_size=12&sort_by=unique_scans_n`,
            ]
          : [
              `${baseUrl}/api/v2/search?ingredients_tags=en:niacinamide&fields=${OBF_FIELDS}&page_size=14&sort_by=unique_scans_n`,
              `${baseUrl}/api/v2/search?ingredients_tags=en:sodium-hyaluronate&fields=${OBF_FIELDS}&page_size=14&sort_by=unique_scans_n`,
              `${baseUrl}/api/v2/search?categories_tags=en:face-creams&fields=${OBF_FIELDS}&page_size=16&sort_by=unique_scans_n`,
              `${baseUrl}/api/v2/search?categories_tags=en:skincare&fields=${OBF_FIELDS}&page_size=14&sort_by=unique_scans_n`,
            ];

      const settled = await Promise.allSettled(
        endpoints.map((url) => fetchObfJson<{ products?: RawOpenBeautyFactsProduct[] }>(url))
      );

      const anyFulfilled = settled.some((r) => r.status === "fulfilled");
      if (!anyFulfilled) {
        throw new Error("All Open Beauty Facts discovery requests failed.");
      }

      const candidates: SkincareProduct[] = [];
      const seenCodes = new Set<string>();
      for (const res of settled) {
        if (res.status !== "fulfilled") continue;
        for (const item of res.value.products || []) {
          const product = normalizeOpenBeautyFactsRecord(item, {
            allowBroadCategory: false,
            minInciTokens: 5,
          });
          if (product && product.barcode && !seenCodes.has(product.barcode)) {
            seenCodes.add(product.barcode);
            candidates.push(product);
          }
          if (candidates.length >= 24) break;
        }
        if (candidates.length >= 24) break;
      }

      if (themes.length > 0) {
        candidates.sort((a, b) => {
          const aOverlap = a.focusThemes.filter((t) => themes.includes(t)).length;
          const bOverlap = b.focusThemes.filter((t) => themes.includes(t)).length;
          return bOverlap - aOverlap;
        });
      }

      normalized = candidates.slice(0, 15);
    }

    if (catalogCache.size > 100) {
      for (const [k, v] of catalogCache.entries()) {
        if (v.expiresAt <= now) catalogCache.delete(k);
      }
    }
    catalogCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      products: normalized,
    });

    return {
      connected: true,
      source: "open-beauty-facts",
      query: query || null,
      themes,
      products: normalized,
    };
  } catch {
    return {
      connected: false,
      source: "unavailable",
      query: query || null,
      themes,
      products: [],
    };
  }
}

export function resetOpenBeautyFactsCacheForTests(): void {
  catalogCache.clear();
}

import "server-only";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { cleanRawInciText, parseInciDeclaration } from "@/lib/ingredients/catalog";
import { fetchOpenBeautyFactsProducts } from "@/lib/ingredients/open-beauty-facts";
import type { FormulationCategory, ProductDataProvenance } from "@/lib/ingredients/types";

const MAX_URL_LENGTH = 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_HTML_BYTES = 512 * 1024; // 512 KB cap

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "broadcasthost",
]);

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".arpa",
  ".lan",
  ".corp",
];

function parseIpv4Octets(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const version = isIP(ip);

  if (version === 4) {
    const octets = parseIpv4Octets(ip);
    if (!octets) return true;
    const [a, b, c] = octets;

    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF / TEST-NET-1
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
    if (a >= 224) return true; // multicast & reserved
    return false;
  }

  if (version === 6) {
    if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:0" || ip === "0:0:0:0:0:0:0:1") {
      return true;
    }
    // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (ip.startsWith("::ffff:")) {
      const tail = ip.slice(7);
      if (isIP(tail) === 4) {
        return isPrivateOrReservedIp(tail);
      }
      // Hex form ::ffff:7f00:0001
      const hexMatch = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hexMatch) {
        const hi = parseInt(hexMatch[1], 16);
        const lo = parseInt(hexMatch[2], 16);
        const mappedV4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
        return isPrivateOrReservedIp(mappedV4);
      }
      return true;
    }
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(ip)) return true; // fe80::/10 link-local
    if (ip.startsWith("ff")) return true; // multicast
    if (ip.startsWith("2001:db8:")) return true; // documentation
    return false;
  }

  // Non-IP or unparseable literal is treated as unsafe if passed directly here
  return true;
}

export type DnsResolverFn = (hostname: string) => Promise<Array<{ address: string }>>;

const defaultDnsResolver: DnsResolverFn = async (hostname: string) => {
  return dnsLookup(hostname, { all: true, verbatim: true });
};

export type SafeUrlValidationResult =
  | { ok: true; url: URL }
  | {
      ok: false;
      code:
        | "INVALID_URL"
        | "INSECURE_PROTOCOL"
        | "DISALLOWED_HOST"
        | "PRIVATE_NETWORK_BLOCKED"
        | "DNS_RESOLUTION_FAILED";
      message: string;
    };

/**
 * Validates an external product page URL against SSRF, credentials, non-HTTPS schemes,
 * non-standard ports, private/reserved IP literals, and DNS resolution to internal IPs.
 */
export async function validateSafeProductUrl(
  rawUrl: string,
  resolveDns: DnsResolverFn = defaultDnsResolver
): Promise<SafeUrlValidationResult> {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim().length > MAX_URL_LENGTH) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Please enter a valid HTTPS product page URL.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "The supplied product URL is malformed.",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      code: "INSECURE_PROTOCOL",
      message: "Only secure HTTPS product URLs (https://) are permitted.",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      code: "DISALLOWED_HOST",
      message: "URLs containing embedded credentials are not permitted.",
    };
  }

  if (parsed.port !== "" && parsed.port !== "443") {
    return {
      ok: false,
      code: "DISALLOWED_HOST",
      message: "Non-standard network ports are not permitted for product URL inspection.",
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOST_SUFFIXES.some((s) => hostname.endsWith(s))
  ) {
    return {
      ok: false,
      code: "PRIVATE_NETWORK_BLOCKED",
      message: "Local, internal, and metadata hostnames are blocked for security.",
    };
  }

  const cleanLiteral = hostname.replace(/^\[|\]$/g, "");
  if (isIP(cleanLiteral) !== 0) {
    if (isPrivateOrReservedIp(cleanLiteral)) {
      return {
        ok: false,
        code: "PRIVATE_NETWORK_BLOCKED",
        message: "Private, loopback, and reserved IP addresses are blocked for security.",
      };
    }
    return { ok: true, url: parsed };
  }

  // Resolve DNS records and verify every returned IP is globally routable
  let records: Array<{ address: string }>;
  try {
    records = await resolveDns(hostname);
  } catch {
    return {
      ok: false,
      code: "DNS_RESOLUTION_FAILED",
      message:
        "Could not resolve or reach that domain from this server environment. Paste the product name and packaging INCI list manually instead.",
    };
  }

  if (!records || records.length === 0) {
    return {
      ok: false,
      code: "DNS_RESOLUTION_FAILED",
      message: "Domain did not return any public IP records.",
    };
  }

  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      return {
        ok: false,
        code: "PRIVATE_NETWORK_BLOCKED",
        message: "Target domain resolves to a restricted internal or private network address.",
      };
    }
  }

  return { ok: true, url: parsed };
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategoryFromText(text: string): FormulationCategory {
  const lower = text.toLowerCase();
  if (/\b(sunscreen|spf\s*\d+|uv\s+defense|sun\s+fluid)\b/.test(lower)) return "Sunscreen";
  if (/\b(cleanser|cleansing|face\s+wash|micellar|gel\s+wash)\b/.test(lower)) return "Cleanser";
  if (/\b(toner|essence|mist|lotion\s+tonique)\b/.test(lower)) return "Toner & Essence";
  if (/\b(retinol|salicylic|glycolic|azelaic|bha|aha|spot\s+treatment)\b/.test(lower)) {
    return "Targeted Treatment";
  }
  if (/\b(serum|ampoule|booster|drops)\b/.test(lower)) return "Hydrating Serum";
  return "Moisturiser & Barrier Cream";
}

export function extractStructuredProductFromHtml(html: string): {
  name: string | null;
  brand: string | null;
  inciDeclaration: string | null;
} {
  let name: string | null = null;
  let brand: string | null = null;
  let inciDeclaration: string | null = null;

  // 1. Inspect JSON-LD Product blocks if present
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of ldMatches) {
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown> | Array<Record<string, unknown>>;
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { "@graph"?: unknown[] })["@graph"])
          ? ((parsed as { "@graph": Array<Record<string, unknown>> })["@graph"] ?? [])
          : [parsed];

      for (const item of items) {
        const typeVal = String(item["@type"] || "").toLowerCase();
        if (typeVal.includes("product")) {
          if (!name && typeof item.name === "string" && item.name.trim()) {
            name = decodeHtmlEntities(item.name).slice(0, 120);
          }
          const rawBrand = item.brand as string | { name?: string } | undefined;
          if (!brand && typeof rawBrand === "string" && rawBrand.trim()) {
            brand = decodeHtmlEntities(rawBrand).slice(0, 80);
          } else if (
            !brand &&
            rawBrand &&
            typeof rawBrand === "object" &&
            typeof rawBrand.name === "string"
          ) {
            brand = decodeHtmlEntities(rawBrand.name).slice(0, 80);
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  // 2. Fallback to og:title or <title>
  if (!name) {
    const ogTitle = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    );
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = ogTitle?.[1] || titleTag?.[1];
    if (rawTitle) {
      name = decodeHtmlEntities(rawTitle.split(/[|–—-]\s+/)[0] || rawTitle).slice(0, 120);
    }
  }

  // 3. Look for explicit full INCI ingredient list in visible text
  const strippedText = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
  );

  const inciBlockMatch = strippedText.match(
    /(?:full\s+ingredients?(?:\s+list)?|ingredients?\s*\(inci\)|ingredients?\s*:)\s*([A-Za-z0-9\s,()./+-]{28,1600})/i
  );
  if (inciBlockMatch?.[1]) {
    const candidateClean = cleanRawInciText(inciBlockMatch[1].split(/\n{2,}/)[0] || "");
    const tokens = parseInciDeclaration(candidateClean);
    const hasWaterOrGlycerinOrOil =
      /\b(aqua|water|eau|glycerin|propanediol|squalane|caprylic|dimethicone|butyrospermum|simmondsia|zinc oxide)\b/i.test(
        candidateClean
      );
    if (tokens.length >= 4 && hasWaterOrGlycerinOrOil) {
      inciDeclaration = candidateClean;
    }
  }

  return { name, brand, inciDeclaration };
}

export interface ProductUrlExtractionResponse {
  ok: boolean;
  extractionStatus: "complete_inci" | "partial_no_inci" | "blocked_or_unreachable";
  provenance: ProductDataProvenance;
  message: string;
  product: {
    name: string;
    brand: string;
    category: FormulationCategory;
    inciDeclaration: string;
    sourceUrl: string;
    barcode: string | null;
  } | null;
}

export async function extractProductFromExternalUrl(
  rawUrl: string,
  options?: { resolveDns?: DnsResolverFn; fetchImpl?: typeof fetch }
): Promise<{ httpStatus: number; body: ProductUrlExtractionResponse }> {
  const resolveDns = options?.resolveDns ?? defaultDnsResolver;
  const fetchFn = options?.fetchImpl ?? fetch;

  // Shortcut for Open Beauty Facts product URLs
  let initialParsed: URL | null = null;
  try {
    initialParsed = new URL(rawUrl.trim());
  } catch {
    initialParsed = null;
  }

  if (
    initialParsed &&
    initialParsed.protocol === "https:" &&
    initialParsed.hostname.toLowerCase().endsWith("openbeautyfacts.org")
  ) {
    const barcodeMatch = initialParsed.pathname.match(/\/product\/(\d{8,14})/);
    if (barcodeMatch?.[1]) {
      const feed = await fetchOpenBeautyFactsProducts(barcodeMatch[1]);
      if (feed.connected && feed.products.length > 0) {
        const p = feed.products[0];
        return {
          httpStatus: 200,
          body: {
            ok: true,
            extractionStatus: p.inciDeclaration ? "complete_inci" : "partial_no_inci",
            provenance: "open-beauty-facts-crowd",
            message:
              "Retrieved crowd-contributed record from Open Beauty Facts. Please confirm the INCI list against your physical packaging before relying on the assessment.",
            product: {
              name: p.name,
              brand: p.brand,
              category: p.category,
              inciDeclaration: p.inciDeclaration || "",
              sourceUrl: p.sourceUrl || initialParsed.toString(),
              barcode: p.barcode || barcodeMatch[1],
            },
          },
        };
      }
    }
  }

  let currentUrlStr = rawUrl.trim();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = await validateSafeProductUrl(currentUrlStr, resolveDns);
    if (!check.ok) {
      const isSecurityBlock =
        check.code === "INSECURE_PROTOCOL" ||
        check.code === "DISALLOWED_HOST" ||
        check.code === "PRIVATE_NETWORK_BLOCKED" ||
        check.code === "INVALID_URL";

      return {
        httpStatus: isSecurityBlock ? 400 : 200,
        body: {
          ok: false,
          extractionStatus: "blocked_or_unreachable",
          provenance: "unverified-url",
          message: check.message,
          product: null,
        },
      };
    }

    let response: Response;
    try {
      response = await fetchFn(check.url.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "User-Agent": "DewAndFormProductCheck/1.0",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return {
        httpStatus: 200,
        body: {
          ok: false,
          extractionStatus: "blocked_or_unreachable",
          provenance: "unverified-url",
          message:
            "Could not retrieve this product page (the retailer site blocked automated requests or outbound network access is unavailable). Enter the product name and paste its INCI list manually below.",
          product: null,
        },
      };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) {
        return {
          httpStatus: 400,
          body: {
            ok: false,
            extractionStatus: "blocked_or_unreachable",
            provenance: "unverified-url",
            message: "Unsafe or excessive redirect chain encountered while inspecting product URL.",
            product: null,
          },
        };
      }
      currentUrlStr = new URL(location, check.url).toString();
      continue;
    }

    if (!response.ok) {
      return {
        httpStatus: 200,
        body: {
          ok: false,
          extractionStatus: "blocked_or_unreachable",
          provenance: "unverified-url",
          message: `The product page returned HTTP ${response.status} and could not be read automatically. Paste the packaging INCI list manually below.`,
          product: null,
        },
      };
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        httpStatus: 400,
        body: {
          ok: false,
          extractionStatus: "blocked_or_unreachable",
          provenance: "unverified-url",
          message: "URL does not point to an HTML product web page.",
          product: null,
        },
      };
    }

    // Stream with strict byte cap
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_HTML_BYTES) {
            await reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }
    }

    const combined = new Uint8Array(Math.min(totalBytes, MAX_HTML_BYTES));
    let offset = 0;
    for (const chunk of chunks) {
      const slice = chunk.subarray(0, combined.byteLength - offset);
      combined.set(slice, offset);
      offset += slice.byteLength;
    }

    const html = new TextDecoder("utf-8").decode(combined);
    const extracted = extractStructuredProductFromHtml(html);

    if (!extracted.name && !extracted.inciDeclaration) {
      return {
        httpStatus: 200,
        body: {
          ok: false,
          extractionStatus: "blocked_or_unreachable",
          provenance: "unverified-url",
          message:
            "Page loaded, but no structured product name or ingredient declaration could be verified—many storefronts load INCI tabs dynamically with client JavaScript. Paste the INCI list manually below.",
          product: null,
        },
      };
    }

    const resolvedName = extracted.name || "Extracted Web Product";
    const resolvedBrand = extracted.brand || "";
    const resolvedCategory = inferCategoryFromText(`${resolvedName} ${extracted.inciDeclaration || ""}`);

    if (!extracted.inciDeclaration) {
      // Strictly never claim verified product data when only name/marketing copy was retrieved
      return {
        httpStatus: 200,
        body: {
          ok: true,
          extractionStatus: "partial_no_inci",
          provenance: "unverified-url",
          message:
            "Retrieved product title only—no verifiable INCI ingredient list was exposed in the static page HTML. This product is NOT verified; please paste the packaging INCI list below before running your assessment.",
          product: {
            name: resolvedName,
            brand: resolvedBrand,
            category: resolvedCategory,
            inciDeclaration: "",
            sourceUrl: check.url.toString(),
            barcode: null,
          },
        },
      };
    }

    return {
      httpStatus: 200,
      body: {
        ok: true,
        extractionStatus: "complete_inci",
        provenance: "unverified-url",
        message:
          "Extracted candidate product title and ingredient text from page HTML. Because web listings can lag behind regional reformulations, review and confirm the INCI list against your physical bottle below.",
        product: {
          name: resolvedName,
          brand: resolvedBrand,
          category: resolvedCategory,
          inciDeclaration: extracted.inciDeclaration,
          sourceUrl: check.url.toString(),
          barcode: null,
        },
      },
    };
  }

  return {
    httpStatus: 400,
    body: {
      ok: false,
      extractionStatus: "blocked_or_unreachable",
      provenance: "unverified-url",
      message: "Maximum redirect limit reached.",
      product: null,
    },
  };
}

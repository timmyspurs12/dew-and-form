// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { evaluateProductCheck } from "@/lib/product-check/evaluator";
import {
  DEFAULT_PERSONAL_PROFILE,
  type ProductCheckCandidate,
  type ProductCheckPersonalProfile,
} from "@/lib/product-check/types";
import {
  isPrivateOrReservedIp,
  validateSafeProductUrl,
} from "@/lib/product-check/url-extractor";
import { POST as ocrPost } from "@/app/api/product-check/ocr/route";

describe("Dew & Form Product Check evaluation engine & security boundaries", () => {
  it("returns 'Not enough information' when INCI is missing or incomplete without claiming verification", () => {
    const incompleteCandidate: ProductCheckCandidate = {
      id: "name-only-1",
      name: "Ultra Miracle Glass Drops",
      brand: "Example Brand",
      category: "Hydrating Serum",
      inciDeclaration: "",
      provenance: "unverified-url",
      userConfirmedLabel: false,
      sourceUrl: null,
      barcode: null,
      price: null,
      sizeLabel: null,
      statedClaims: ["clinically-proven", "hydrating-barrier"],
    };

    const result = evaluateProductCheck(incompleteCandidate, DEFAULT_PERSONAL_PROFILE);

    expect(result.verdict).toBe("not_enough_info");
    expect(result.verdictTitle).toBe("Not enough information");
    expect(result.normalizedProduct).toBeNull();
    expect(result.missingInformation.join(" ")).toMatch(/INCI ingredient declaration is missing/i);
    expect(
      result.claimAssessments.every((c) => c.status === "unverifiable_from_inci")
    ).toBe(true);
  });

  it("returns 'Good potential fit' for a complete fragrance-free barrier formula aligned with user goals while preserving evidence boundaries", () => {
    const candidate: ProductCheckCandidate = {
      id: "barrier-serum-1",
      name: "Barrier Ceramide & Panthenol Fluid",
      brand: "Sample Label",
      category: "Hydrating Serum",
      inciDeclaration:
        "Aqua, Glycerin, Panthenol, Niacinamide, Sodium Hyaluronate, Ceramide NP, Squalane, Allantoin, Phenoxyethanol",
      provenance: "confirmed-packaging-label",
      userConfirmedLabel: true,
      sourceUrl: null,
      barcode: null,
      price: { amount: 18, currency: "USD" },
      sizeLabel: "50 ml",
      statedClaims: ["fragrance-free", "hydrating-barrier", "non-comedogenic-hypoallergenic"],
    };

    const profile: ProductCheckPersonalProfile = {
      ...DEFAULT_PERSONAL_PROFILE,
      goals: ["hydration-support", "gentle-soothing"],
      skinType: "Sensitive-leaning",
      sensitivities: ["fragrance", "essential-oils"],
      budgetMaxAmount: 25,
      budgetCurrency: "USD",
    };

    const result = evaluateProductCheck(candidate, profile);

    expect(result.verdict).toBe("good_potential_fit");
    expect(result.concerns).toHaveLength(0);
    expect(result.supportingReasons.join(" ")).toMatch(/Hydration & Water Retention/i);
    expect(result.supportingReasons.join(" ")).toMatch(/budget ceiling/i);
    expect(result.dataConfidence.level).toBe("high");
    expect(result.finishedFormulaBoundaryNote).toMatch(
      /do not establish clinical proof, non-comedogenicity/i
    );

    const nonComedogenicClaim = result.claimAssessments.find(
      (c) => c.claim === "non-comedogenic-hypoallergenic"
    );
    expect(nonComedogenicClaim?.status).toBe("unverifiable_from_inci");
    expect(result.sourceReferences.some((r) => r.id === "ec-cosing")).toBe(true);
  });

  it("returns 'Some concerns' when personal sensitivities, contradicted claims, routine acid overlap, or budget limits are triggered", () => {
    const candidate: ProductCheckCandidate = {
      id: "peel-toner-1",
      name: "Botanical Citrus AHA Peel",
      brand: "Sample Label",
      category: "Targeted Treatment",
      inciDeclaration:
        "Aqua, Alcohol Denat., Glycolic Acid, Salicylic Acid, Lavandula Angustifolia Oil, Parfum, Limonene, Phenoxyethanol",
      provenance: "open-beauty-facts-crowd",
      userConfirmedLabel: false,
      sourceUrl: "https://world.openbeautyfacts.org/product/12345678",
      barcode: "12345678",
      price: { amount: 42, currency: "USD" },
      sizeLabel: "100 ml",
      statedClaims: ["fragrance-free", "clinically-proven"],
    };

    const profile: ProductCheckPersonalProfile = {
      ...DEFAULT_PERSONAL_PROFILE,
      goals: ["gentle-soothing"],
      skinType: "Sensitive-leaning",
      sensitivities: ["fragrance", "drying-alcohol"],
      customAllergens: "Phenoxyethanol",
      usesLeaveOnAcidInRoutine: true,
      usesDailySunscreen: "no",
      budgetMaxAmount: 30,
      budgetCurrency: "USD",
    };

    const result = evaluateProductCheck(candidate, profile);

    expect(result.verdict).toBe("some_concerns");
    const joinedConcerns = result.concerns.join(" | ");
    expect(joinedConcerns).toMatch(/Personal sensitivity conflict \(Fragrance/i);
    expect(joinedConcerns).toMatch(/Short-chain denatured alcohol/i);
    expect(joinedConcerns).toMatch(/Custom allergen \/ ingredient flag: "Phenoxyethanol"/i);
    expect(joinedConcerns).toMatch(/Routine overlap concern/i);
    expect(joinedConcerns).toMatch(/Sun-sensitivity caution/i);
    expect(joinedConcerns).toMatch(/Label claim conflict: Marked 'Fragrance-free/i);
    expect(joinedConcerns).toMatch(/Budget consideration/i);

    // Crowd-sourced OBF provenance must clearly warn about regional/batch variations
    expect(result.dataConfidence.unverifiedNotes.join(" ")).toMatch(
      /crowd-contributed Open Beauty Facts data/i
    );
  });

  it("blocks private, loopback, link-local metadata, IPv6-mapped, and non-HTTPS URLs against SSRF", async () => {
    expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("10.0.0.8")).toBe(true);
    expect(isPrivateOrReservedIp("172.16.5.4")).toBe(true);
    expect(isPrivateOrReservedIp("192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedIp("::1")).toBe(true);
    expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);

    const httpCheck = await validateSafeProductUrl("http://example.com/product");
    expect(httpCheck.ok).toBe(false);

    const localhostCheck = await validateSafeProductUrl("https://localhost/admin");
    expect(localhostCheck.ok).toBe(false);

    const metadataCheck = await validateSafeProductUrl(
      "https://169.254.169.254/latest/meta-data/"
    );
    expect(metadataCheck.ok).toBe(false);

    const customPortCheck = await validateSafeProductUrl("https://8.8.8.8:8443/product");
    expect(customPortCheck.ok).toBe(false);

    const credentialsCheck = await validateSafeProductUrl(
      "https://user:secret@example.com/product"
    );
    expect(credentialsCheck.ok).toBe(false);
  });

  it("validates binary JPEG/PNG magic bytes and reports an honest OCR capability boundary when OCR is unconfigured", async () => {
    // 1. Spoofed non-image bytes rejected with 400
    const badForm = new FormData();
    badForm.append(
      "inciImage",
      new File([new TextEncoder().encode("not-an-image")], "fake.png", {
        type: "image/png",
      })
    );
    const badReq = new NextRequest("http://localhost:3000/api/product-check/ocr", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: badForm,
    });
    const badRes = await ocrPost(badReq);
    expect(badRes.status).toBe(400);

    // 2. Valid minimal 200x200 PNG header (>= 64 bytes) accepted; returns ocrConfigured: false boundary cleanly
    const minimalPng = new Uint8Array(128);
    minimalPng.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    minimalPng.set([0x00, 0x00, 0x00, 0x0d], 8);
    minimalPng.set([0x49, 0x48, 0x44, 0x52], 12);
    minimalPng[18] = 0x00;
    minimalPng[19] = 0xc8; // width = 200
    minimalPng[22] = 0x00;
    minimalPng[23] = 0xc8; // height = 200
    minimalPng.set([8, 2, 0, 0, 0], 24);
    const validForm = new FormData();
    validForm.append(
      "inciImage",
      new File([minimalPng], "label.png", { type: "image/png" })
    );
    const validReq = new NextRequest("http://localhost:3000/api/product-check/ocr", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: validForm,
    });
    const validRes = await ocrPost(validReq);
    expect(validRes.status).toBe(200);
    const json = (await validRes.json()) as {
      ok: boolean;
      ocrConfigured: boolean;
      status: string;
    };
    expect(json.ok).toBe(true);
    expect(json.ocrConfigured).toBe(false);
    expect(json.status).toBe("manual_transcription_ready");
  });
});

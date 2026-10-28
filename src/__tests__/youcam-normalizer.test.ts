import { describe, expect, it } from "vitest";
import {
  CONSERVATIVE_HD_ACTIONS,
  CONSERVATIVE_SD_ACTIONS,
  resolveConfiguredDstActions,
  validateV21DstActions,
} from "@/lib/youcam/config";
import {
  buildDstActions,
  validateDstActionsNotMixed,
  validateSkinImageInput,
} from "@/lib/youcam/validation";
import {
  extractYouCamOutputItems,
  mapYouCamEngineError,
  normalizeYouCamJsonOutput,
} from "@/lib/youcam/normalizer";
import { redactSensitiveText } from "@/lib/youcam/security";
import { parseInciDeclaration } from "@/lib/ingredients/catalog";

describe("YouCam v2.1 conservative action set & file validation", () => {
  it("uses a conservative, verified v2.1 action set by default and blocks mixing or unknown actions", () => {
    const sd = buildDstActions("sd");
    const hd = buildDstActions("hd");

    expect(sd).toEqual([...CONSERVATIVE_SD_ACTIONS]);
    expect(hd).toEqual([...CONSERVATIVE_HD_ACTIONS]);
    expect(sd).toEqual(["skin_type", "acne", "oiliness"]);
    expect(hd).toEqual(["hd_skin_type", "hd_acne", "hd_oiliness"]);

    expect(validateDstActionsNotMixed(sd).valid).toBe(true);
    expect(validateDstActionsNotMixed(hd).valid).toBe(true);
    expect(validateDstActionsNotMixed(["moisture", "hd_pore"]).valid).toBe(false);
    expect(validateV21DstActions(["skin_type", "not_a_real_action"]).valid).toBe(false);

    // Deliberate server override works when valid & homogeneous, and throws when invalid
    expect(resolveConfiguredDstActions("sd", "skin_type, acne, moisture")).toEqual([
      "skin_type",
      "acne",
      "moisture",
    ]);
    expect(() => resolveConfiguredDstActions("sd", "skin_type, hd_acne")).toThrow();
  });

  it("enforces YouCam MIME type, strict < 10MB file size, and SD/HD minimum short-side dimensions", () => {
    expect(
      validateSkinImageInput({
        mimeType: "image/webp",
        sizeBytes: 500_000,
        width: 1200,
        height: 1600,
        mode: "sd",
      }).valid
    ).toBe(false);

    // Exactly 10 MB is rejected because YouCam v2.1 specifies `< 10MB`
    expect(
      validateSkinImageInput({
        mimeType: "image/jpeg",
        sizeBytes: 10 * 1024 * 1024,
        width: 1200,
        height: 1600,
        mode: "sd",
      }).valid
    ).toBe(false);

    // 720x960 passes SD (>= 480px) but fails HD (>= 1080px)
    expect(
      validateSkinImageInput({
        mimeType: "image/jpeg",
        sizeBytes: 850_000,
        width: 720,
        height: 960,
        mode: "sd",
      }).valid
    ).toBe(true);

    expect(
      validateSkinImageInput({
        mimeType: "image/jpeg",
        sizeBytes: 850_000,
        width: 720,
        height: 960,
        mode: "hd",
      }).valid
    ).toBe(false);
  });
});

describe("YouCam v2.1 JSON output normalizer & secret redaction", () => {
  it("preserves ui_score, raw_score, skin_type zones, sub-regions, and marks missing fields unavailable instead of zero", () => {
    const normalized = normalizeYouCamJsonOutput({
      taskId: "tsk_12345",
      mode: "hd",
      requestedActions: ["hd_pore", "hd_moisture", "hd_redness", "hd_skin_type"],
      dataSource: "live-youcam-api",
      output: [
        { type: "hd_skin_type", region: "whole", skin_type: "Combination" },
        { type: "hd_skin_type", region: "t_zone", skin_type: "Oily" },
        { type: "hd_pore", region: "whole", raw_score: 49.24, ui_score: 67 },
        { type: "hd_pore", region: "nose", raw_score: 29.14, ui_score: 58 },
        { type: "hd_moisture", region: "whole", raw_score: 48.69, ui_score: 70 },
        { type: "all", score: 75.76 },
      ],
    });

    expect(normalized.skinType.whole).toBe("Combination");
    expect(normalized.skinType.zones).toHaveLength(2);
    expect(normalized.overallScore).toBe(75.8);
    expect(normalized.estimatedSkinAge).toBeNull();

    const pore = normalized.metrics.find((m) => m.key === "pore");
    expect(pore?.uiScore).toBe(67);
    expect(pore?.rawScore).toBe(49.2);
    expect(pore?.regions.find((r) => r.region === "nose")?.uiScore).toBe(58);

    // Redness was requested but omitted in output -> must NOT appear as 0 in metrics
    expect(normalized.metrics.find((m) => m.key === "redness")).toBeUndefined();
    const unreturnedRedness = normalized.unavailableConcerns.find((u) => u.key === "redness");
    expect(unreturnedRedness?.reason).toBe("not_returned");

    // Wrinkle was not requested -> marked not_requested
    const unrequestedWrinkle = normalized.unavailableConcerns.find((u) => u.key === "wrinkle");
    expect(unrequestedWrinkle?.reason).toBe("not_requested");
  });

  it("extracts items from both standard v2.1 output[] arrays and score_info dictionary structures", () => {
    const dictExtract = extractYouCamOutputItems({
      skin_type: {
        whole: { skin_type: "Dry" },
        t_zone: { skin_type: "Normal" },
      },
      acne: { whole: { ui_score: 88, raw_score: 86.2 } },
      all: { score: 82.4 },
    });
    expect(dictExtract.ok).toBe(true);
    if (dictExtract.ok) {
      const norm = normalizeYouCamJsonOutput({
        taskId: "tsk_dict",
        mode: "sd",
        dataSource: "live-youcam-api",
        output: dictExtract.items,
      });
      expect(norm.skinType.whole).toBe("Dry");
      expect(norm.metrics.find((m) => m.key === "acne")?.uiScore).toBe(88);
      expect(norm.overallScore).toBe(82.4);
    }
  });

  it("redacts Bearer tokens, API keys, and pre-signed storage URLs from diagnostic text", () => {
    const dirty =
      "Failed PUT to https://bucket.s3.amazonaws.com/face.jpg?X-Amz-Algorithm=AWS4&X-Amz-Signature=deadbeef99 with Authorization: Bearer my_super_secret_token";
    const clean = redactSensitiveText(dirty, ["my_super_secret_token"]);
    expect(clean).not.toContain("deadbeef99");
    expect(clean).not.toContain("my_super_secret_token");
    expect(clean).toContain("[REDACTED_SIGNED_URL]");
    expect(clean).toContain("Bearer [REDACTED]");
  });

  it("maps documented YouCam engine errors to calm, actionable guidance", () => {
    const faceSmall = mapYouCamEngineError("error_src_face_too_small");
    expect(faceSmall.category).toBe("image_quality");
    expect(faceSmall.message).toContain("60–80%");
  });
});

describe("INCI parser & monograph lookup", () => {
  it("matches documented ingredients and preserves unmatched vehicle entries honestly", () => {
    const parsed = parseInciDeclaration(
      "Aqua, Glycerin, Niacinamide, Propanediol, Phenoxyethanol"
    );
    expect(parsed).toHaveLength(5);
    expect(parsed[0].monograph?.inciName).toBe("AQUA");
    expect(parsed[1].monograph?.inciName).toBe("GLYCERIN");
    expect(parsed[2].monograph?.inciName).toBe("NIACINAMIDE");
    expect(parsed[3].monograph).toBeNull();
    expect(parsed[3].rawLabel).toBe("Propanediol");
  });
});

// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import AppleIcon, { size as appleSize } from "@/app/apple-icon";
import OpenGraphImage, { alt as ogAlt, size as ogSize } from "@/app/opengraph-image";
import TwitterImage, { size as twitterSize } from "@/app/twitter-image";
import { resolveSiteMetadataBase } from "@/lib/seo/metadata-base";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("Dew & Form favicon, Apple icon, and OpenGraph/Twitter social card", () => {
  it("resolves metadataBase cleanly across explicit, Vercel production, preview, and fallback URLs", () => {
    expect(
      resolveSiteMetadataBase({
        NEXT_PUBLIC_SITE_URL: "https://dew-and-form.example.com",
        VERCEL_PROJECT_PRODUCTION_URL: "ignored.vercel.app",
      }).origin
    ).toBe("https://dew-and-form.example.com");

    expect(
      resolveSiteMetadataBase({
        VERCEL_PROJECT_PRODUCTION_URL: "dew-and-form-az1b.vercel.app",
      }).origin
    ).toBe("https://dew-and-form-az1b.vercel.app");

    expect(
      resolveSiteMetadataBase({
        VERCEL_URL: "dew-and-form-preview-123.vercel.app",
      }).origin
    ).toBe("https://dew-and-form-preview-123.vercel.app");

    expect(resolveSiteMetadataBase({}).origin).toBe(
      "https://dew-and-form-az1b.vercel.app"
    );
  });

  it("ships a crisp forest-and-ivory vector favicon at src/app/icon.svg", () => {
    const svgPath = path.resolve(process.cwd(), "src/app/icon.svg");
    expect(fs.existsSync(svgPath)).toBe(true);

    const svg = fs.readFileSync(svgPath, "utf8");
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain("#26382F");
    expect(svg).toContain("#F7F5EF");
    expect(svg).toContain("#B8CCB0");
  });

  it("renders valid PNG buffers for OpenGraph (1200x630), Twitter (1200x630), and Apple icon (180x180)", async () => {
    expect(ogSize).toEqual({ width: 1200, height: 630 });
    expect(twitterSize).toEqual({ width: 1200, height: 630 });
    expect(appleSize).toEqual({ width: 180, height: 180 });
    expect(ogAlt).toContain("Dew & Form");

    const [ogRes, twRes, appleRes] = await Promise.all([
      OpenGraphImage(),
      TwitterImage(),
      AppleIcon(),
    ]);

    expect(ogRes.headers.get("content-type")).toBe("image/png");
    expect(twRes.headers.get("content-type")).toBe("image/png");
    expect(appleRes.headers.get("content-type")).toBe("image/png");

    const [ogBuf, twBuf, appleBuf] = await Promise.all([
      ogRes.arrayBuffer().then((ab) => Buffer.from(ab)),
      twRes.arrayBuffer().then((ab) => Buffer.from(ab)),
      appleRes.arrayBuffer().then((ab) => Buffer.from(ab)),
    ]);

    expect(ogBuf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(twBuf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(appleBuf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(ogBuf.byteLength).toBeGreaterThan(10_000);
    expect(appleBuf.byteLength).toBeGreaterThan(1_500);
  });
});

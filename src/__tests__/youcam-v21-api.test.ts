// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createSkinAnalysisRoute } from "@/app/api/skin-analysis/route";
import { GET as pollSkinAnalysisRoute } from "@/app/api/skin-analysis/[taskId]/route";
import { resetRateLimitsForTests } from "@/lib/youcam/security";
import type { AnalysisApiEnvelope } from "@/lib/youcam/types";

/**
 * Builds a minimal, structurally valid binary PNG buffer (`89 50 4E 47 ...` + `IHDR` + `IEND`)
 * with exact encoded width and height for server-side magic-byte & dimension testing.
 */
function createValidPngBytes(width: number, height: number, padSize = 128): Uint8Array {
  const total = Math.max(45, padSize);
  const buf = new Uint8Array(total);
  // PNG 8-byte signature
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length = 13
  buf.set([0x00, 0x00, 0x00, 0x0d], 8);
  // "IHDR"
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  // Width (big-endian uint32)
  buf[16] = (width >>> 24) & 0xff;
  buf[17] = (width >>> 16) & 0xff;
  buf[18] = (width >>> 8) & 0xff;
  buf[19] = width & 0xff;
  // Height (big-endian uint32)
  buf[20] = (height >>> 24) & 0xff;
  buf[21] = (height >>> 16) & 0xff;
  buf[22] = (height >>> 8) & 0xff;
  buf[23] = height & 0xff;
  // bitDepth = 8, colorType = 2 (RGB), compression = 0, filter = 0, interlace = 0
  buf.set([8, 2, 0, 0, 0], 24);
  return buf;
}

/**
 * Builds a minimal, structurally valid binary JPEG buffer (`FF D8 FF E0 ... FF C0 ... FF D9`)
 * with exact encoded SOF0 width and height for server-side magic-byte & dimension testing.
 */
function createValidJpegBytes(width: number, height: number, padSize = 128): Uint8Array {
  const total = Math.max(40, padSize);
  const buf = new Uint8Array(total);
  // SOI
  buf[0] = 0xff;
  buf[1] = 0xd8;
  // APP0 marker (FF E0), length 16
  buf[2] = 0xff;
  buf[3] = 0xe0;
  buf[4] = 0x00;
  buf[5] = 0x10;
  // "JFIF\0"
  buf.set([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00], 6);
  // SOF0 marker (FF C0), length 11
  buf[20] = 0xff;
  buf[21] = 0xc0;
  buf[22] = 0x00;
  buf[23] = 0x0b;
  buf[24] = 0x08; // 8-bit precision
  buf[25] = (height >>> 8) & 0xff;
  buf[26] = height & 0xff;
  buf[27] = (width >>> 8) & 0xff;
  buf[28] = width & 0xff;
  buf[29] = 0x01; // components
  buf[30] = 0x01;
  buf[31] = 0x11;
  buf[32] = 0x00;
  // EOI
  buf[33] = 0xff;
  buf[34] = 0xd9;
  return buf;
}

function buildMultipartRequest(
  formData: FormData,
  options?: { cookie?: string; origin?: string; host?: string; ip?: string }
): Request {
  const headers = new Headers();
  if (options?.cookie) headers.set("cookie", options.cookie);
  if (options?.origin) headers.set("origin", options.origin);
  if (options?.host) headers.set("host", options.host);
  if (options?.ip) headers.set("x-forwarded-for", options.ip);

  return new Request("http://localhost:3000/api/skin-analysis", {
    method: "POST",
    headers,
    body: formData,
  });
}

function extractSessionCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/df_sid=[^;]+/);
  return match ? match[0] : "";
}

describe("YouCam AI Skin Analysis v2.1 Server API & Security Contract", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimitsForTests();
    process.env = {
      ...originalEnv,
      YOUCAM_API_KEY: "test_secret_youcam_api_key_do_not_expose",
      YOUCAM_API_BASE_URL: "https://yce-api-01.makeupar.com",
      YOUCAM_ANALYSIS_MODE: "sd",
    };
    delete process.env.YOUCAM_DST_ACTIONS;
    delete process.env.YOUCAM_HD_DST_ACTIONS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("1 & 9. accepts valid JPEG upload, runs File API + pre-signed PUT + v2.1 task creation with conservative SD actions, and binds task to HttpOnly session", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "https://yce-api-01.makeupar.com/s2s/v2.0/file") {
        expect(init?.headers).toMatchObject({
          Authorization: "Bearer test_secret_youcam_api_key_do_not_expose",
        });
        return new Response(
          JSON.stringify({
            status: 200,
            data: {
              files: [
                {
                  file_id: "file_sd_001",
                  requests: [
                    {
                      method: "PUT",
                      url: "https://youcam-uploads.s3.amazonaws.com/object1?X-Amz-Signature=topsecret123",
                      headers: { "Content-Type": "image/jpeg" },
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200 }
        );
      }

      if (url.startsWith("https://youcam-uploads.s3.amazonaws.com/")) {
        // Must NEVER leak YouCam Authorization header to S3 pre-signed URL
        const headers = init?.headers as Record<string, string>;
        expect(headers.Authorization).toBeUndefined();
        return new Response("", { status: 200 });
      }

      if (url === "https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis") {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body).toEqual({
          src_file_id: "file_sd_001",
          dst_actions: ["skin_type", "acne", "oiliness"],
          format: "json",
          miniserver_args: { enable_mask_overlay: false },
          pf_camera_kit: false,
        });
        return new Response(
          JSON.stringify({
            status: 200,
            data: { task_id: "SaGaqpDgKw_v21_sd_01" },
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const jpegBytes = createValidJpegBytes(720, 960);
    const form = new FormData();
    form.append("image", new File([jpegBytes.slice()], "portrait.jpg", { type: "image/jpeg" }));
    form.append("mode", "sd");

    const res = await createSkinAnalysisRoute(buildMultipartRequest(form));
    expect(res.status).toBe(202);

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("df_sid=");
    expect(setCookie).toContain("HttpOnly");

    const body = (await res.json()) as AnalysisApiEnvelope;
    expect(body.status).toBe("processing");
    if (body.status === "processing") {
      expect(body.taskId.startsWith("dft1.")).toBe(true);
      expect(body.publicRef.startsWith("tsk_")).toBe(true);
      expect(body.mode).toBe("sd");
      // Never leaks raw provider ID, API key, or signed URL
      expect(JSON.stringify(body)).not.toContain("test_secret_youcam_api_key_do_not_expose");
      expect(JSON.stringify(body)).not.toContain("topsecret123");
    }
  });

  it("2. accepts valid PNG upload in HD mode using verified conservative HD actions without mixing SD", async () => {
    let capturedTaskBody: Record<string, unknown> | null = null;
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/s2s/v2.0/file")) {
        const fileBody = JSON.parse(String(init?.body)) as {
          files: Array<{ content_type: string }>;
        };
        // Uses binary-inspected PNG MIME type even if client passed image/jpeg
        expect(fileBody.files[0].content_type).toBe("image/png");
        return new Response(
          JSON.stringify({
            status: 200,
            data: {
              files: [
                {
                  file_id: "file_hd_png_002",
                  requests: [{ method: "PUT", url: "https://storage.makeupar.com/put-png" }],
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url === "https://storage.makeupar.com/put-png") {
        return new Response("", { status: 200 });
      }
      if (url.endsWith("/s2s/v2.1/task/skin-analysis")) {
        capturedTaskBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(
          JSON.stringify({ status: 200, data: { task_id: "hd_task_002" } }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected URL ${url}`);
    }) as unknown as typeof fetch;

    const pngBytes = createValidPngBytes(1200, 1600);
    const form = new FormData();
    // Deliberately pass mismatched client MIME to prove server uses magic-byte inspection
    form.append("image", new File([pngBytes.slice()], "selfie.png", { type: "image/jpeg" }));
    form.append("mode", "hd");

    const res = await createSkinAnalysisRoute(buildMultipartRequest(form));
    expect(res.status).toBe(202);
    expect(capturedTaskBody).toMatchObject({
      src_file_id: "file_hd_png_002",
      dst_actions: ["hd_skin_type", "hd_acne", "hd_oiliness"],
      format: "json",
    });
  });

  it("3. rejects invalid binary file format even when filename and MIME spoof image/jpeg before calling YouCam", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const spoofedGif = new TextEncoder().encode("GIF89a-not-a-jpeg-or-png-binary-payload");
    const form = new FormData();
    form.append("image", new File([spoofedGif], "spoofed.jpg", { type: "image/jpeg" }));

    const res = await createSkinAnalysisRoute(buildMultipartRequest(form));
    expect(res.status).toBe(400);
    const body = (await res.json()) as AnalysisApiEnvelope;
    expect(body.status).toBe("error");
    if (body.status === "error") {
      expect(body.error.code).toBe("UNSUPPORTED_BINARY_FORMAT");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("4. rejects oversized files (>= 10 MB) before calling YouCam", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const tenMbBuffer = new Uint8Array(10 * 1024 * 1024);
    const form = new FormData();
    form.append("image", new File([tenMbBuffer], "huge.jpg", { type: "image/jpeg" }));

    const res = await createSkinAnalysisRoute(buildMultipartRequest(form));
    expect(res.status).toBe(400);
    const body = (await res.json()) as AnalysisApiEnvelope;
    expect(body.status).toBe("error");
    if (body.status === "error") {
      expect(body.error.code).toBe("FILE_TOO_LARGE");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("5. rejects too-small binary image dimensions (< 480px SD, < 1080px HD) before calling YouCam", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    // 360x640 fails SD (< 480px short side)
    const smallJpeg = createValidJpegBytes(360, 640);
    const sdForm = new FormData();
    sdForm.append("image", new File([smallJpeg.slice()], "tiny.jpg", { type: "image/jpeg" }));
    sdForm.append("mode", "sd");

    const sdRes = await createSkinAnalysisRoute(buildMultipartRequest(sdForm));
    expect(sdRes.status).toBe(400);
    const sdBody = (await sdRes.json()) as AnalysisApiEnvelope;
    expect(sdBody.status).toBe("error");
    if (sdBody.status === "error") {
      expect(sdBody.error.code).toBe("IMAGE_DIMENSIONS_TOO_SMALL");
    }

    // 720x960 fails HD (< 1080px short side)
    const mediumPng = createValidPngBytes(720, 960);
    const hdForm = new FormData();
    hdForm.append("image", new File([mediumPng.slice()], "med.png", { type: "image/png" }));
    hdForm.append("mode", "hd");

    const hdRes = await createSkinAnalysisRoute(buildMultipartRequest(hdForm));
    expect(hdRes.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("6. rejects missing file, empty 0-byte upload, and truncated/malformed JPEG headers cleanly", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    // Missing image field
    const emptyForm = new FormData();
    emptyForm.append("mode", "sd");
    const missingRes = await createSkinAnalysisRoute(buildMultipartRequest(emptyForm));
    expect(missingRes.status).toBe(400);
    expect(((await missingRes.json()) as { error: { code: string } }).error.code).toBe(
      "MISSING_IMAGE"
    );

    // Empty 0-byte file
    const zeroForm = new FormData();
    zeroForm.append("image", new File([new Uint8Array(0)], "empty.jpg", { type: "image/jpeg" }));
    const zeroRes = await createSkinAnalysisRoute(buildMultipartRequest(zeroForm));
    expect(zeroRes.status).toBe(400);
    expect(((await zeroRes.json()) as { error: { code: string } }).error.code).toBe("EMPTY_FILE");

    // Truncated JPEG with SOI but no valid SOF frame header
    const corruptJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xd9]);
    const corruptForm = new FormData();
    corruptForm.append("image", new File([corruptJpeg], "corrupt.jpg", { type: "image/jpeg" }));
    const corruptRes = await createSkinAnalysisRoute(buildMultipartRequest(corruptForm));
    expect(corruptRes.status).toBe(400);
    expect(((await corruptRes.json()) as { error: { code: string } }).error.code).toBe(
      "MALFORMED_IMAGE"
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("7. handles missing YOUCAM_API_KEY gracefully without exposing configuration internals", async () => {
    process.env.YOUCAM_API_KEY = "";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const form = new FormData();
    form.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );

    const res = await createSkinAnalysisRoute(buildMultipartRequest(form));
    expect(res.status).toBe(503);
    const body = (await res.json()) as AnalysisApiEnvelope;
    expect(body.status).toBe("error");
    if (body.status === "error") {
      expect(body.error.category).toBe("api_not_configured");
      expect(body.error.code).toBe("YOUCAM_API_KEY_MISSING");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("8. handles File API upload failure and pre-signed PUT failure while redacting signed URLs and secrets", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/s2s/v2.0/file")) {
        return new Response(
          JSON.stringify({
            status: 200,
            data: {
              files: [
                {
                  file_id: "file_fail_put",
                  requests: [
                    {
                      method: "PUT",
                      url: "https://youcam-uploads.s3.amazonaws.com/private?X-Amz-Signature=supersecret_sig_999",
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      // Simulate pre-signed PUT 403 rejection
      return new Response("SignatureDoesNotMatch", { status: 403 });
    }) as unknown as typeof fetch;

    const form = new FormData();
    form.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );

    const res = await createSkinAnalysisRoute(buildMultipartRequest(form));
    expect(res.status).toBe(502);
    const rawText = await res.text();
    expect(rawText).toContain("PUT_HTTP_403");
    expect(rawText).not.toContain("supersecret_sig_999");
    expect(rawText).not.toContain("youcam-uploads.s3.amazonaws.com");
    expect(rawText).not.toContain("test_secret_youcam_api_key_do_not_expose");
  });

  it("10. handles v2.1 task creation authentication (401) and parameter (400) failures safely", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/s2s/v2.0/file")) {
        return new Response(
          JSON.stringify({
            status: 200,
            data: {
              files: [
                {
                  file_id: "file_auth_err",
                  requests: [{ method: "PUT", url: "https://storage.makeupar.com/u1" }],
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url === "https://storage.makeupar.com/u1") {
        return new Response("", { status: 200 });
      }
      return new Response(
        JSON.stringify({
          status: 401,
          error: "Unauthorized",
          error_message: "Invalid Bearer test_secret_youcam_api_key_do_not_expose",
        }),
        { status: 401 }
      );
    }) as unknown as typeof fetch;

    const form = new FormData();
    form.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );

    const res = await createSkinAnalysisRoute(buildMultipartRequest(form));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain("InvalidApiKey");
    expect(text).not.toContain("test_secret_youcam_api_key_do_not_expose");
  });

  it("11, 12, 13 & 16. polls GET /s2s/v2.1/task/skin-analysis/{id} across running, partial success (no fabricated zeros), and HTTP-200 task error states", async () => {
    let stage: "running" | "success" | "error" = "running";

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/s2s/v2.0/file")) {
        return new Response(
          JSON.stringify({
            status: 200,
            data: {
              files: [
                {
                  file_id: "file_poll_test",
                  requests: [{ method: "PUT", url: "https://storage.makeupar.com/u2" }],
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url === "https://storage.makeupar.com/u2") {
        return new Response("", { status: 200 });
      }
      if (url === "https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis") {
        return new Response(
          JSON.stringify({ status: 200, data: { task_id: "v21_poll_task_77" } }),
          { status: 200 }
        );
      }
      if (url === "https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis/v21_poll_task_77") {
        if (stage === "running") {
          return new Response(
            JSON.stringify({
              status: 200,
              data: { task_id: "v21_poll_task_77", task_status: "running" },
            }),
            { status: 200 }
          );
        }
        if (stage === "error") {
          // HTTP 200 with task_status: "error" per YouCam OpenAPI contract!
          return new Response(
            JSON.stringify({
              status: 200,
              data: {
                task_id: "v21_poll_task_77",
                task_status: "error",
                error: "error_lighting_dark",
                error_message: "Ambient illumination below threshold",
              },
            }),
            { status: 200 }
          );
        }
        // Partial success matching playground categories: skin_type, acne, oiliness only
        return new Response(
          JSON.stringify({
            status: 200,
            data: {
              task_id: "v21_poll_task_77",
              task_status: "success",
              results: {
                output: [
                  { type: "skin_type", region: "whole", skin_type: "Combination" },
                  { type: "skin_type", region: "t_zone", skin_type: "Oily" },
                  { type: "skin_type", region: "u_zone", skin_type: "Normal" },
                  { type: "acne", region: "whole", ui_score: 84, raw_score: 81.6 },
                  { type: "oiliness", region: "whole", ui_score: 73, raw_score: 69.2 },
                ],
              },
            },
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected URL ${url}`);
    }) as unknown as typeof fetch;

    const form = new FormData();
    form.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );
    const createRes = await createSkinAnalysisRoute(buildMultipartRequest(form));
    const sessionCookie = extractSessionCookie(createRes);
    const created = (await createRes.json()) as Extract<AnalysisApiEnvelope, { status: "processing" }>;

    // 11. Running check -> status: "processing" (never success!)
    const pollReq1 = new Request(
      `http://localhost:3000/api/skin-analysis/${encodeURIComponent(created.taskId)}`,
      { headers: { cookie: sessionCookie } }
    );
    const pollRes1 = await pollSkinAnalysisRoute(pollReq1, {
      params: Promise.resolve({ taskId: created.taskId }),
    });
    const pollBody1 = (await pollRes1.json()) as AnalysisApiEnvelope;
    expect(pollBody1.status).toBe("processing");

    // 13. Task error inside HTTP 200 -> status: "error" with mapped lighting guidance
    stage = "error";
    const pollResErr = await pollSkinAnalysisRoute(pollReq1, {
      params: Promise.resolve({ taskId: created.taskId }),
    });
    const pollBodyErr = (await pollResErr.json()) as AnalysisApiEnvelope;
    expect(pollBodyErr.status).toBe("error");
    if (pollBodyErr.status === "error") {
      expect(pollBodyErr.error.category).toBe("image_quality");
      expect(pollBodyErr.error.code).toBe("error_lighting_dark");
    }

    // 12 & 16. Task success with partial results -> preserves exact scores, never invents 0s
    stage = "success";
    const pollResOk = await pollSkinAnalysisRoute(pollReq1, {
      params: Promise.resolve({ taskId: created.taskId }),
    });
    const pollBodyOk = (await pollResOk.json()) as AnalysisApiEnvelope;
    expect(pollBodyOk.status).toBe("success");
    if (pollBodyOk.status === "success") {
      expect(pollBodyOk.result.skinType.whole).toBe("Combination");
      expect(pollBodyOk.result.skinType.zones).toHaveLength(3);
      expect(pollBodyOk.result.metrics.map((m) => m.key)).toEqual(["oiliness", "acne"]);
      expect(pollBodyOk.result.overallScore).toBeNull();
      expect(pollBodyOk.result.estimatedSkinAge).toBeNull();
      // Unrequested concerns are explicitly marked not_requested, never 0
      expect(
        pollBodyOk.result.unavailableConcerns.find((c) => c.key === "wrinkle")?.reason
      ).toBe("not_requested");
    }
  });

  it("14 & 15. handles upstream timeouts (504), YouCam 429 Retry-After, and local abuse rate-limiting (429)", async () => {
    // Upstream timeout test
    global.fetch = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }) as unknown as typeof fetch;

    const form1 = new FormData();
    form1.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );
    const timeoutRes = await createSkinAnalysisRoute(
      buildMultipartRequest(form1, { ip: "203.0.113.10" })
    );
    expect(timeoutRes.status).toBe(504);
    const timeoutBody = (await timeoutRes.json()) as AnalysisApiEnvelope;
    expect(timeoutBody.status).toBe("error");
    if (timeoutBody.status === "error") {
      expect(timeoutBody.error.category).toBe("timeout");
    }

    // Upstream 429 test
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ error: "TooManyRequests" }), {
        status: 429,
        headers: { "Retry-After": "18" },
      });
    }) as unknown as typeof fetch;

    const form2 = new FormData();
    form2.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );
    const upstream429 = await createSkinAnalysisRoute(
      buildMultipartRequest(form2, { ip: "203.0.113.11" })
    );
    expect(upstream429.status).toBe(429);
    expect(upstream429.headers.get("retry-after")).toBe("18");

    // Local rate limit abuse protection (> 6 task creations from same session+IP within 5 minutes)
    const sessionCookie = "df_sid=rate_limit_session_abcdef123456";
    for (let i = 0; i < 6; i++) {
      const f = new FormData();
      f.append(
        "image",
        new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
      );
      await createSkinAnalysisRoute(
        buildMultipartRequest(f, { cookie: sessionCookie, ip: "203.0.113.55" })
      );
    }

    const fetchAfterCap = vi.fn();
    global.fetch = fetchAfterCap as unknown as typeof fetch;
    const f7 = new FormData();
    f7.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );
    const local429 = await createSkinAnalysisRoute(
      buildMultipartRequest(f7, { cookie: sessionCookie, ip: "203.0.113.55" })
    );
    expect(local429.status).toBe(429);
    const localBody = (await local429.json()) as AnalysisApiEnvelope;
    expect(localBody.status).toBe("error");
    if (localBody.status === "error") {
      expect(localBody.error.code).toBe("LOCAL_RATE_LIMITED");
    }
    expect(fetchAfterCap).not.toHaveBeenCalled();
  });

  it("17 & Security. rejects malformed upstream JSON, ZIP-only result schemas, arbitrary client taskIds, tampered tokens, and cross-session polling", async () => {
    let returnMalformedBody = true;

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/s2s/v2.0/file")) {
        return new Response(
          JSON.stringify({
            status: 200,
            data: {
              files: [
                {
                  file_id: "file_sec_01",
                  requests: [{ method: "PUT", url: "https://storage.makeupar.com/u3" }],
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url === "https://storage.makeupar.com/u3") {
        return new Response("", { status: 200 });
      }
      if (url.endsWith("/s2s/v2.1/task/skin-analysis")) {
        return new Response(
          JSON.stringify({ status: 200, data: { task_id: "sec_task_99" } }),
          { status: 200 }
        );
      }
      if (returnMalformedBody) {
        return new Response("<html>502 Bad Gateway</html>", { status: 200 });
      }
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            task_id: "sec_task_99",
            task_status: "success",
            results: { url: "https://cdn.makeupar.com/result.zip" },
          },
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const form = new FormData();
    form.append(
      "image",
      new File([createValidJpegBytes(600, 800).slice()], "ok.jpg", { type: "image/jpeg" })
    );
    const createRes = await createSkinAnalysisRoute(buildMultipartRequest(form));
    const ownerCookie = extractSessionCookie(createRes);
    const created = (await createRes.json()) as Extract<AnalysisApiEnvelope, { status: "processing" }>;

    // Arbitrary raw client taskId is rejected without hitting YouCam
    const arbitraryRes = await pollSkinAnalysisRoute(
      new Request("http://localhost:3000/api/skin-analysis/arbitrary_raw_task_id", {
        headers: { cookie: ownerCookie },
      }),
      { params: Promise.resolve({ taskId: "arbitrary_raw_task_id" }) }
    );
    expect(arbitraryRes.status).toBe(400);

    // Valid token polled from a DIFFERENT user session is rejected with 403 TASK_OWNERSHIP_MISMATCH
    const attackerRes = await pollSkinAnalysisRoute(
      new Request(
        `http://localhost:3000/api/skin-analysis/${encodeURIComponent(created.taskId)}`,
        { headers: { cookie: "df_sid=different_browser_session_id_999" } }
      ),
      { params: Promise.resolve({ taskId: created.taskId }) }
    );
    expect(attackerRes.status).toBe(403);
    expect(((await attackerRes.json()) as { error: { code: string } }).error.code).toBe(
      "TASK_OWNERSHIP_MISMATCH"
    );

    // Malformed non-JSON upstream body -> 502 MALFORMED_PROVIDER_RESPONSE
    const malformedRes = await pollSkinAnalysisRoute(
      new Request(
        `http://localhost:3000/api/skin-analysis/${encodeURIComponent(created.taskId)}`,
        { headers: { cookie: ownerCookie } }
      ),
      { params: Promise.resolve({ taskId: created.taskId }) }
    );
    expect(malformedRes.status).toBe(502);
    expect(((await malformedRes.json()) as { error: { code: string } }).error.code).toBe(
      "MALFORMED_PROVIDER_RESPONSE"
    );

    // Unexpected ZIP-only result when JSON format was requested -> 502 UNEXPECTED_RESULT_FORMAT
    returnMalformedBody = false;
    const zipOnlyRes = await pollSkinAnalysisRoute(
      new Request(
        `http://localhost:3000/api/skin-analysis/${encodeURIComponent(created.taskId)}`,
        { headers: { cookie: ownerCookie } }
      ),
      { params: Promise.resolve({ taskId: created.taskId }) }
    );
    expect(zipOnlyRes.status).toBe(502);
    expect(((await zipOnlyRes.json()) as { error: { code: string } }).error.code).toBe(
      "UNEXPECTED_RESULT_FORMAT"
    );
  });
});

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DewAndFormExperience } from "@/components/DewAndFormExperience";
import { ProductComparison } from "@/components/ProductComparison";
import { REFERENCE_FORMULATION_FIXTURES } from "@/fixtures/reference-formulations";
import { normalizeYouCamJsonOutput } from "@/lib/youcam/normalizer";

beforeEach(() => {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });

  if (typeof URL.createObjectURL === "undefined") {
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-preview");
  } else {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/test-preview");
  }
  if (typeof URL.revokeObjectURL === "undefined") {
    URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  }

  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/skin-analysis/status")) {
      return new Response(JSON.stringify({ liveApiConfigured: false }), { status: 200 });
    }
    if (url.includes("/api/products")) {
      return new Response(JSON.stringify({ connected: false, products: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as unknown as typeof fetch;
});

describe("Dew & Form frontend experience & v2.1 state transitions", () => {
  it("renders brand identity, tagline, editorial hero, and honest initial empty states without fake scores or products", () => {
    render(<DewAndFormExperience />);

    expect(screen.getAllByText(/Dew & Form/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Find your skin's kind of care\./i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /Your skin, understood\./i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /Complete a skin analysis to view your personal insights/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /No live retail product feed is connected yet/i,
      })
    ).toBeInTheDocument();
  });

  it("clearly badges development fixture insights, toggles UI vs Raw scores, and preserves unreturned fields distinctly", () => {
    render(<DewAndFormExperience />);

    const previewBtn = screen.getByRole("button", {
      name: /Preview documented HD sample fixture/i,
    });
    fireEvent.click(previewBtn);

    expect(
      screen.getByText(/Development Fixture · Documented YouCam HD Sample Schema/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/They are not a live AI scan of your face\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Unreturned or unrequested fields \(3\)/i)
    ).toBeInTheDocument();

    const rawRadio = screen.getByRole("radio", { name: /Raw Model \(1–100\)/i });
    fireEvent.click(rawRadio);
    expect(rawRadio).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText(/Currently showing YouCam's unadjusted floating-point raw_score\./i)
    ).toBeInTheDocument();
  });

  it("completes upload -> processing -> transient poll recovery -> live v2.1 result without duplicate task creation", async () => {
    const OriginalImage = window.Image;
    class MockImage {
      naturalWidth = 1200;
      naturalHeight = 1600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error test image mock
    window.Image = MockImage;

    const liveResult = normalizeYouCamJsonOutput({
      taskId: "tsk_live_abc",
      apiVersion: "v2.1",
      mode: "sd",
      dataSource: "live-youcam-api",
      requestedActions: ["skin_type", "acne", "oiliness"],
      output: [
        { type: "skin_type", region: "whole", skin_type: "Normal" },
        { type: "acne", raw_score: 82.4, ui_score: 85 },
        { type: "oiliness", raw_score: 74.1, ui_score: 78 },
      ],
    });

    let postCount = 0;
    let pollStep = 0;
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/skin-analysis/status")) {
        return new Response(JSON.stringify({ liveApiConfigured: true }), { status: 200 });
      }
      if (url.includes("/api/products")) {
        return new Response(JSON.stringify({ connected: false, products: [] }), { status: 200 });
      }
      if (url === "/api/skin-analysis" && init?.method === "POST") {
        postCount += 1;
        return new Response(
          JSON.stringify({
            status: "processing",
            taskId: "dft1.signed_token.sig",
            publicRef: "tsk_live_abc",
            mode: "sd",
            pollAfterMs: 250,
          }),
          { status: 202 }
        );
      }
      if (url.includes("/api/skin-analysis/dft1.signed_token.sig")) {
        pollStep += 1;
        if (pollStep === 1) {
          return new Response(
            JSON.stringify({
              status: "processing",
              taskId: "dft1.signed_token.sig",
              publicRef: "tsk_live_abc",
              mode: "sd",
              pollAfterMs: 250,
            }),
            { status: 200 }
          );
        }
        if (pollStep === 2) {
          // Simulate a transient 502 blip on status check — UI must retry polling same taskId, NOT create a second task!
          return new Response(
            JSON.stringify({
              status: "error",
              error: {
                category: "network",
                code: "POLL_NETWORK_ERROR",
                title: "Transient blip",
                message: "Temporary upstream network error",
              },
            }),
            { status: 502 }
          );
        }
        return new Response(
          JSON.stringify({
            status: "success",
            taskId: "dft1.signed_token.sig",
            publicRef: "tsk_live_abc",
            result: liveResult,
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as unknown as typeof fetch;

    try {
      const { container } = render(<DewAndFormExperience />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File([new Uint8Array(2048)], "portrait.jpg", {
        type: "image/jpeg",
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Local Preview · Unanalysed/i)).toBeInTheDocument();
      });

      const analyseButton = screen.getByRole("button", { name: /Analyse my skin/i });
      // Rapid double-click must only submit ONE paid task!
      fireEvent.click(analyseButton);
      fireEvent.click(analyseButton);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Live YouCam AI Skin Analysis \(SD\)/i)
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(postCount).toBe(1);
      expect(pollStep).toBe(3);
      expect(
        screen.getByText(/Your analysis indicates a normal complexion profile\./i)
      ).toBeInTheDocument();
    } finally {
      window.Image = OriginalImage;
    }
  });

  it("preserves selected image across provider/rate-limit errors so the user can retry cleanly", async () => {
    const OriginalImage = window.Image;
    class MockImage {
      naturalWidth = 1080;
      naturalHeight = 1440;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error test image mock
    window.Image = MockImage;

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/skin-analysis" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            status: "error",
            error: {
              category: "rate_limited",
              code: "TooManyRequests",
              title: "Analysis service is temporarily rate-limited",
              message: "Please wait briefly before retrying.",
              retryAfterSeconds: 8,
            },
          }),
          { status: 429 }
        );
      }
      return new Response(JSON.stringify({ liveApiConfigured: true, products: [] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    try {
      const { container } = render(<DewAndFormExperience />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File([new Uint8Array(4096)], "keep-me.jpg", {
        type: "image/jpeg",
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByText("keep-me.jpg")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Analyse my skin/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: /Analysis service is temporarily rate-limited/i,
          })
        ).toBeInTheDocument();
      });

      // Selected image remains preserved so user doesn't have to re-pick it!
      expect(screen.getByText("keep-me.jpg")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry available in 8s/i })).toBeDisabled();
    } finally {
      window.Image = OriginalImage;
    }
  });

  it("handles overall client polling timeout and resumes checking the existing task without creating a duplicate paid task", async () => {
    const OriginalImage = window.Image;
    class MockImage {
      naturalWidth = 1080;
      naturalHeight = 1440;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error test image mock
    window.Image = MockImage;

    let fakeNow = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => fakeNow);

    let postCount = 0;
    let pollPhase: "stall" | "ready" = "stall";

    const liveResult = normalizeYouCamJsonOutput({
      taskId: "tsk_timeout_resume",
      apiVersion: "v2.1",
      mode: "sd",
      dataSource: "live-youcam-api",
      requestedActions: ["skin_type", "acne", "oiliness"],
      output: [
        { type: "skin_type", region: "whole", skin_type: "Dry" },
        { type: "acne", raw_score: 79.5, ui_score: 82 },
      ],
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/skin-analysis" && init?.method === "POST") {
        postCount += 1;
        return new Response(
          JSON.stringify({
            status: "processing",
            taskId: "dft1.timeout_token.sig",
            publicRef: "tsk_timeout_resume",
            mode: "sd",
            pollAfterMs: 250,
          }),
          { status: 202 }
        );
      }
      if (url.includes("/api/skin-analysis/dft1.timeout_token.sig")) {
        if (pollPhase === "stall") {
          // Advance wall clock past the 90-second overall polling deadline after first poll
          fakeNow += 95_000;
          return new Response(
            JSON.stringify({
              status: "processing",
              taskId: "dft1.timeout_token.sig",
              publicRef: "tsk_timeout_resume",
              mode: "sd",
              pollAfterMs: 250,
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            status: "success",
            taskId: "dft1.timeout_token.sig",
            publicRef: "tsk_timeout_resume",
            result: liveResult,
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ liveApiConfigured: true, products: [] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    try {
      const { container } = render(<DewAndFormExperience />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, {
        target: { files: [new File([new Uint8Array(2048)], "timeout.jpg", { type: "image/jpeg" })] },
      });

      await waitFor(() => {
        expect(screen.getByText("timeout.jpg")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Analyse my skin/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Analysis is taking longer than expected/i })
        ).toBeInTheDocument();
      });

      // Now task finishes upstream; clicking "Check status again" polls existing task without a second POST!
      pollPhase = "ready";
      fireEvent.click(screen.getByRole("button", { name: /Check status again/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Your analysis indicates a dry complexion profile\./i)
        ).toBeInTheDocument();
      });

      expect(postCount).toBe(1);

      // Starting a new analysis resets results cleanly
      fireEvent.click(screen.getByRole("button", { name: /Start new analysis/i }));
      expect(
        screen.getByRole("heading", {
          name: /Complete a skin analysis to view your personal insights/i,
        })
      ).toBeInTheDocument();
    } finally {
      nowSpy.mockRestore();
      window.Image = OriginalImage;
    }
  });

  it("allows adding a shelf product, inspecting its INCI monographs, and comparing formulations honestly", async () => {
    render(<DewAndFormExperience />);

    const openShelfBtn = screen.getByRole("button", {
      name: /Add & inspect a product from your shelf/i,
    });
    fireEvent.click(openShelfBtn);

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Calm Humectant Gel" },
    });
    fireEvent.change(screen.getByLabelText(/Price \(optional\)/i), {
      target: { value: "24" },
    });
    fireEvent.change(screen.getByLabelText(/INCI Ingredient Declaration/i), {
      target: { value: "Aqua, Glycerin, Niacinamide, Panthenol, Phenoxyethanol" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Add to discovery & INCI inspector/i })
    );

    expect(
      screen.getByRole("heading", { name: "Calm Humectant Gel" })
    ).toBeInTheDocument();
    expect(screen.getByText("$24.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Inspect INCI/i }));
    expect(screen.getByText(/Declared INCI Composition \(5 entries\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Limitations & Missing Formulation Information/i)
    ).toBeInTheDocument();
  });

  it("compares formulations side by side honestly without inventing prices or winners", () => {
    render(
      <ProductComparison
        comparedProducts={REFERENCE_FORMULATION_FIXTURES.slice(0, 2)}
        selectedThemes={["hydration-support"]}
        onRemoveFromCompare={() => undefined}
        onClearComparison={() => undefined}
        onInspectProduct={() => undefined}
      />
    );

    expect(
      screen.getAllByText(/Multi-Humectant & Panthenol Serum/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Azelaic & Niacinamide Balancing Emulsion/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Unavailable \(Non-commercial fixture\)/i).length
    ).toBeGreaterThan(0);
  });
});

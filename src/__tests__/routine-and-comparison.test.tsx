import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DewAndFormExperience } from "@/components/DewAndFormExperience";
import { writePersistedOnboardingStatus } from "@/lib/onboarding/storage";
import { ROUTINE_STORAGE_KEY, resetRoutineStoreForTests } from "@/lib/routine/storage";
import { evaluateRoutineCompatibility } from "@/lib/routine/compatibility";
import { REFERENCE_FORMULATION_FIXTURES } from "@/fixtures/reference-formulations";
import type { SkincareProduct } from "@/lib/ingredients/types";

beforeEach(() => {
  writePersistedOnboardingStatus("completed");
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });

  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/skin-analysis/status")) {
      return new Response(JSON.stringify({ liveApiConfigured: false }), { status: 200 });
    }
    if (url.includes("/api/products")) {
      return new Response(
        JSON.stringify({
          connected: true,
          source: "open-beauty-facts",
          products: REFERENCE_FORMULATION_FIXTURES.slice(0, 2),
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as unknown as typeof fetch;
});

describe("Product Check UI, Persistent My Routine, and Enhanced Comparison", () => {
  it("evaluates all three Product Check verdicts in the UI and allows saving an evaluated product to My Routine", () => {
    render(<DewAndFormExperience />);

    const checkSection = document.getElementById("product-check")!;

    // 1. Sample Missing-INCI scenario -> 'Not enough information'
    fireEvent.click(within(checkSection).getByRole("button", { name: /Missing-INCI product/i }));
    fireEvent.click(within(checkSection).getByRole("button", { name: /Evaluate Product Fit/i }));

    expect(
      within(checkSection).getByRole("article", {
        name: /Product Check Verdict: Not enough information/i,
      })
    ).toBeInTheDocument();

    // 2. Sample Fragranced AHA toner -> 'Some concerns' (contradicted 'Fragrance-free' claim)
    fireEvent.click(within(checkSection).getByRole("button", { name: /Fragranced AHA toner/i }));
    fireEvent.click(within(checkSection).getByRole("button", { name: /Evaluate Product Fit/i }));

    expect(
      within(checkSection).getByRole("article", {
        name: /Product Check Verdict: Some concerns/i,
      })
    ).toBeInTheDocument();
    expect(within(checkSection).getAllByText(/Contradicted by INCI/i).length).toBeGreaterThan(0);

    // 3. Sample Barrier serum -> 'Good potential fit' -> Save to AM Routine
    fireEvent.click(within(checkSection).getByRole("button", { name: /Barrier serum/i }));
    fireEvent.click(within(checkSection).getByRole("button", { name: /Evaluate Product Fit/i }));

    const fitArticle = within(checkSection).getByRole("article", {
      name: /Product Check Verdict: Good potential fit/i,
    });
    expect(fitArticle).toBeInTheDocument();

    fireEvent.click(within(fitArticle).getByRole("button", { name: /Save to AM Routine/i }));

    const routineSection = document.getElementById("my-routine")!;
    expect(
      within(routineSection).getByText("Soothing Panthenol & Ceramide Fluid")
    ).toBeInTheDocument();
  });

  it("allows adding owned products to My Routine, persists across browser remounts, and flags active routine conflicts", () => {
    const { unmount } = render(<DewAndFormExperience />);

    const routineSection = document.getElementById("my-routine")!;
    fireEvent.click(within(routineSection).getByRole("button", { name: /Add Product I Own/i }));

    fireEvent.change(within(routineSection).getByLabelText(/Staple Title \*/i), {
      target: { value: "Evening Retinol Serum" },
    });
    fireEvent.change(within(routineSection).getByLabelText(/When do you use it\?/i), {
      target: { value: "evening" },
    });
    fireEvent.change(within(routineSection).getByLabelText(/Step Type/i), {
      target: { value: "Targeted Treatment" },
    });
    fireEvent.change(
      within(routineSection).getByLabelText(/INCI Ingredient List \(optional/i),
      {
        target: { value: "Aqua, Glycerin, Squalane, Retinol, Tocopherol, Phenoxyethanol" },
      }
    );

    fireEvent.click(within(routineSection).getByRole("button", { name: /Save to My Routine/i }));

    expect(within(routineSection).getByText("Evening Retinol Serum")).toBeInTheDocument();
    // Flags missing Morning Sunscreen alongside renewal active
    expect(
      within(routineSection).getByText(
        /Renewal active present without a Morning Sunscreen listed/i
      )
    ).toBeInTheDocument();

    // Verify localStorage persistence across remount
    const rawSaved = window.localStorage.getItem(ROUTINE_STORAGE_KEY);
    expect(rawSaved).toBeTruthy();

    unmount();
    resetRoutineStoreForTests();
    render(<DewAndFormExperience />);

    const remountedRoutine = document.getElementById("my-routine")!;
    expect(within(remountedRoutine).getByText("Evening Retinol Serum")).toBeInTheDocument();
  });

  it("detects same-session AHA/BHA + retinoid stacking and morning retinoid placement in evaluateRoutineCompatibility", () => {
    const glycolicToner: SkincareProduct = {
      ...REFERENCE_FORMULATION_FIXTURES[2],
      id: "test-aha",
      name: "7% Glycolic Toning Solution",
      category: "Targeted Treatment",
      inciDeclaration: "Aqua, Glycolic Acid, Propanediol, Glycerin, Panthenol",
      attributes: ["Fragrance-free", "Leave-on", "Contains exfoliating acid"],
    };

    const retinolSerum: SkincareProduct = {
      ...REFERENCE_FORMULATION_FIXTURES[2],
      id: "test-retinol",
      name: "0.5% Retinol Night Emulsion",
      category: "Targeted Treatment",
      inciDeclaration: "Aqua, Squalane, Glycerin, Retinol, Ceramide NP",
      attributes: ["Fragrance-free", "Leave-on", "Contains retinoid"],
    };

    const warnings = evaluateRoutineCompatibility({
      morningProducts: [retinolSerum],
      eveningProducts: [glycolicToner, retinolSerum],
    });

    const ids = warnings.map((w) => w.id);
    expect(ids).toContain("morning-retinoid-placement");
    expect(ids).toContain("evening-acid-retinoid-stack");
    expect(ids).toContain("cross-missing-morning-spf");
  });

  it("sends an evaluated Product Check item into Upgraded Comparison with contextual fit & distinctive INCI", async () => {
    render(<DewAndFormExperience />);

    // Wait for initial catalogue products to load, then click Compare on first card
    const compareButtons = await screen.findAllByRole("button", { name: /^Compare$/i });
    fireEvent.click(compareButtons[0]);

    // Evaluate sample Fragranced AHA toner in Product Check -> click 'Compare with another product'
    const checkSection = document.getElementById("product-check")!;
    fireEvent.click(within(checkSection).getByRole("button", { name: /Fragranced AHA toner/i }));
    fireEvent.click(within(checkSection).getByRole("button", { name: /Evaluate Product Fit/i }));
    fireEvent.click(
      within(checkSection).getByRole("button", { name: /Compare with another product/i })
    );

    const comparisonSection = document.getElementById("comparison")!;
    expect(
      within(comparisonSection).getAllByText(/Botanical Citrus Glow Peel Toner/i).length
    ).toBeGreaterThan(0);
    expect(within(comparisonSection).getAllByText(/Contextual Fit/i).length).toBeGreaterThan(0);
    expect(within(comparisonSection).getAllByText(/Distinctive INCI/i).length).toBeGreaterThan(
      0
    );
  });
});

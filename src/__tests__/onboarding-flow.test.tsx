import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DewAndFormExperience } from "@/components/DewAndFormExperience";
import { ONBOARDING_STORAGE_KEY, resetOnboardingStoreForTests } from "@/lib/onboarding/storage";

beforeEach(() => {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });

  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/skin-analysis/status")) {
      return new Response(JSON.stringify({ liveApiConfigured: true }), { status: 200 });
    }
    if (url.includes("/api/products")) {
      return new Response(
        JSON.stringify({
          connected: true,
          source: "open-beauty-facts",
          products: [],
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as unknown as typeof fetch;
});

describe("Dew & Form first-time visitor interactive onboarding modal", () => {
  it("displays an accessible modal popup with a blurred translucent backdrop over the existing homepage and isolates background interaction", () => {
    const { container } = render(<DewAndFormExperience />);

    // Modal dialog is open on first visit
    const modal = screen.getByRole("dialog", {
      name: /Find your skin’s kind of care\./i,
    });
    expect(modal).toBeInTheDocument();

    // Backdrop uses CSS backdrop-filter blur and is a sibling (never an ancestor of modal text)
    const backdrop = screen.getByTestId("onboarding-modal-backdrop");
    expect(backdrop).toBeInTheDocument();
    expect(backdrop.className).toContain("backdrop-blur");
    expect(backdrop.contains(modal)).toBe(false);

    // Existing homepage remains rendered underneath (not replaced by a separate page),
    // while interaction/AT access to the dimmed background is isolated while modal is open
    expect(container.textContent).toContain("Your skin, understood.");
    expect(
      screen.queryByRole("heading", { name: /Your skin, understood\./i })
    ).not.toBeInTheDocument();

    // Step 1 controls, progress bar, step count, and close button
    expect(within(modal).getByText("Step 1 of 4")).toBeInTheDocument();
    const progressBar = within(modal).getByRole("progressbar", {
      name: /Onboarding progress/i,
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "1");
    expect(progressBar).toHaveAttribute("aria-valuemax", "4");

    expect(
      within(modal).getByRole("button", { name: /Close onboarding tour/i })
    ).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Next$/i })).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Skip intro$/i })).toBeInTheDocument();
  });

  it("updates modal content in place across all 4 steps via Next/Back/keyboard step indicators and persists Finish", () => {
    const { unmount } = render(<DewAndFormExperience />);

    const modal = screen.getByRole("dialog");

    // Step 1 -> Step 2 in place via Next (does NOT close modal)
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(modal).getByText("Step 2 of 4")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(
      within(modal).getByRole("heading", { name: "Skin Analysis" })
    ).toBeInTheDocument();
    expect(
      within(modal).getByText(
        /Upload a clear, front-facing daylight face photo in the Skin Analysis Workspace/i
      )
    ).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Back$/i })).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /^Try Skin Analysis$/i })
    ).toBeInTheDocument();

    // Step 2 -> Step 3 in place via Next
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    expect(within(modal).getByText("Step 3 of 4")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(
      within(modal).getByRole("heading", { name: "Product Discovery & Comparison" })
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /^Explore Products$/i })
    ).toBeInTheDocument();

    // Step 3 -> Step 4 in place via Next
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    expect(within(modal).getByText("Step 4 of 4")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
    expect(
      within(modal).getByRole("heading", {
        name: "Ingredient Explorer & Product Check",
      })
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /Open Ingredient Explorer/i })
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /Inspect a Shelf Product/i })
    ).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Finish$/i })).toBeInTheDocument();

    // Step 4 -> Step 3 via Back
    fireEvent.click(within(modal).getByRole("button", { name: /^Back$/i }));
    expect(within(modal).getByText("Step 3 of 4")).toBeInTheDocument();

    // Keyboard ArrowRight on Step 3 pill -> advances to Step 4
    const step3Pill = within(modal).getByRole("button", {
      name: /Step 3 of 4: Product Discovery & Comparison/i,
    });
    expect(step3Pill).toHaveAttribute("aria-current", "step");
    fireEvent.keyDown(step3Pill, { key: "ArrowRight" });
    expect(within(modal).getByText("Step 4 of 4")).toBeInTheDocument();

    // Finish dismisses modal, restores background accessibility, and persists completion
    fireEvent.click(within(modal).getByRole("button", { name: /^Finish$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Your skin, understood\./i })
    ).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) || "{}");
    expect(stored.status).toBe("completed");

    // Returning visitor remount does not show modal again
    unmount();
    resetOnboardingStoreForTests();
    render(<DewAndFormExperience />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports Skip intro, Close button, Escape dismissal, and reopening from Step 1 via 'Take a tour'", async () => {
    render(<DewAndFormExperience />);

    // 1. Dismiss via Skip intro
    const modal = screen.getByRole("dialog");
    fireEvent.click(within(modal).getByRole("button", { name: /^Skip intro$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) || "{}").status
    ).toBe("skipped");

    // 2. Reopen via header "Take a tour" button -> starts at Step 1
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    const reopenedByHeader = await screen.findByRole("dialog");
    expect(within(reopenedByHeader).getByText("Step 1 of 4")).toBeInTheDocument();
    expect(
      within(reopenedByHeader).getByRole("heading", {
        name: /Find your skin’s kind of care\./i,
      })
    ).toBeInTheDocument();

    // Advance to Step 2, then close via visible X button
    fireEvent.click(within(reopenedByHeader).getByRole("button", { name: /^Next$/i }));
    expect(within(reopenedByHeader).getByText("Step 2 of 4")).toBeInTheDocument();
    fireEvent.click(
      within(reopenedByHeader).getByRole("button", { name: /Close onboarding tour/i })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // 3. Reopen via footer "Replay guided tour" -> resets cleanly back to Step 1, then dismiss via Escape
    fireEvent.click(screen.getByRole("button", { name: /Replay guided tour/i }));
    const reopenedByFooter = await screen.findByRole("dialog");
    expect(within(reopenedByFooter).getByText("Step 1 of 4")).toBeInTheDocument();

    fireEvent.keyDown(reopenedByFooter, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("connects direct-action buttons ('Try Skin Analysis', 'Explore Products', 'Open Ingredient Explorer', 'Inspect a Shelf Product') to real features", async () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy,
    });

    render(<DewAndFormExperience />);

    // 1. Step 2 -> "Try Skin Analysis" navigates to #analysis and guards duplicate clicks
    let modal = screen.getByRole("dialog");
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));

    const tryAnalysisBtn = within(modal).getByRole("button", {
      name: /^Try Skin Analysis$/i,
    });
    fireEvent.click(tryAnalysisBtn);
    fireEvent.click(tryAnalysisBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("analysis-heading");
    });
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    // 2. Reopen -> Step 3 -> "Explore Products" navigates to #discovery
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    modal = await screen.findByRole("dialog");
    fireEvent.click(
      within(modal).getByRole("button", {
        name: /Step 3 of 4: Product Discovery & Comparison/i,
      })
    );
    fireEvent.click(within(modal).getByRole("button", { name: /^Explore Products$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("discovery-heading");
    });

    // 3. Reopen -> Step 4 -> "Open Ingredient Explorer" opens real IngredientDetails drawer
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    modal = await screen.findByRole("dialog");
    fireEvent.click(
      within(modal).getByRole("button", {
        name: /Step 4 of 4: Ingredient Explorer & Product Check/i,
      })
    );
    fireEvent.click(
      within(modal).getByRole("button", { name: /Open Ingredient Explorer/i })
    );

    const inciDrawer = await screen.findByRole("dialog", {
      name: /Cosmetic Ingredient Monographs/i,
    });
    expect(
      within(inciDrawer).getByRole("searchbox", {
        name: /Search documented ingredients/i,
      })
    ).toBeInTheDocument();

    // Close IngredientDetails drawer
    fireEvent.click(
      within(inciDrawer).getByRole("button", {
        name: /Close ingredient transparency panel/i,
      })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // 4. Reopen -> Step 4 -> "Inspect a Shelf Product" opens real FormulaShelfModal
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    modal = await screen.findByRole("dialog");
    fireEvent.click(
      within(modal).getByRole("button", {
        name: /Step 4 of 4: Ingredient Explorer & Product Check/i,
      })
    );
    fireEvent.click(
      within(modal).getByRole("button", { name: /Inspect a Shelf Product/i })
    );

    const shelfModal = await screen.findByRole("dialog", {
      name: /Inspect a product from your shelf/i,
    });
    expect(
      within(shelfModal).getByLabelText(/INCI Ingredient Declaration/i)
    ).toBeInTheDocument();
  });

  it("handles unavailable or throwing browser localStorage gracefully without breaking the website", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    try {
      render(<DewAndFormExperience />);
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();

      expect(() => {
        fireEvent.click(within(modal).getByRole("button", { name: /^Skip intro$/i }));
      }).not.toThrow();

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Your skin, understood\./i })
      ).toBeInTheDocument();

      // Replay still works using in-memory fallback
      fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });

  it("supports reopening the onboarding modal from the mobile navigation drawer", async () => {
    render(<DewAndFormExperience />);

    // Dismiss initial modal first
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /^Skip intro$/i,
      })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Open mobile navigation menu drawer
    fireEvent.click(screen.getByRole("button", { name: /Open navigation menu/i }));
    const mobileDrawer = await screen.findByRole("dialog", { name: /Dew & Form/i });

    // Click mobile "Take a tour" -> closes mobile drawer and opens onboarding modal at Step 1
    fireEvent.click(within(mobileDrawer).getByRole("button", { name: /Take a tour/i }));

    const onboardingModal = await screen.findByRole("dialog", {
      name: /Find your skin’s kind of care\./i,
    });
    expect(within(onboardingModal).getByText("Step 1 of 4")).toBeInTheDocument();
  });
});

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DewAndFormExperience } from "@/components/DewAndFormExperience";
import { TAKE_TOUR_ENTRY_GLOW_DURATION_MS } from "@/components/BrandHeader";
import {
  ONBOARDING_STORAGE_KEY,
  resetOnboardingStoreForTests,
  writePersistedOnboardingStatus,
} from "@/lib/onboarding/storage";

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

describe("Dew & Form first-time visitor 5-step interactive onboarding modal", () => {
  it("displays an accessible modal popup with a blurred translucent backdrop over the existing homepage and isolates background interaction", () => {
    const { container } = render(<DewAndFormExperience />);

    const modal = screen.getByRole("dialog", {
      name: /Find your skin’s kind of care\./i,
    });
    expect(modal).toBeInTheDocument();

    const backdrop = screen.getByTestId("onboarding-modal-backdrop");
    expect(backdrop).toBeInTheDocument();
    expect(backdrop.className).toContain("backdrop-blur");
    expect(backdrop.contains(modal)).toBe(false);

    expect(container.textContent).toContain("Your skin, understood.");
    expect(
      screen.queryByRole("heading", { name: /Your skin, understood\./i })
    ).not.toBeInTheDocument();

    expect(within(modal).getByText("Step 1 of 5")).toBeInTheDocument();
    const progressBar = within(modal).getByRole("progressbar", {
      name: /Onboarding progress/i,
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "1");
    expect(progressBar).toHaveAttribute("aria-valuemax", "5");

    expect(
      within(modal).getByRole("button", { name: /Close onboarding tour/i })
    ).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Next$/i })).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Skip intro$/i })).toBeInTheDocument();
  });

  it("updates modal content in place across all 5 steps via Next/Back/keyboard step indicators and persists Finish", () => {
    const { unmount } = render(<DewAndFormExperience />);

    const modal = screen.getByRole("dialog");

    // Step 1 -> Step 2 (Skin Analysis)
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(modal).getByText("Step 2 of 5")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(
      within(modal).getByRole("heading", { name: "Skin Analysis" })
    ).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Back$/i })).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /^Try Skin Analysis$/i })
    ).toBeInTheDocument();

    // Step 2 -> Step 3 (Discovery & Comparison)
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    expect(within(modal).getByText("Step 3 of 5")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(
      within(modal).getByRole("heading", { name: "Product Discovery & Comparison" })
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /^Explore Products$/i })
    ).toBeInTheDocument();

    // Step 3 -> Step 4 (Dew & Form Product Check)
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    expect(within(modal).getByText("Step 4 of 5")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
    expect(
      within(modal).getByRole("heading", {
        name: "Dew & Form Product Check",
      })
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /Open Product Check/i })
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /Open Ingredient Explorer/i })
    ).toBeInTheDocument();

    // Step 4 -> Step 5 (My Routine)
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    expect(within(modal).getByText("Step 5 of 5")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5");
    expect(
      within(modal).getByRole("heading", { name: "My Routine" })
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: /^Open My Routine$/i })
    ).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /^Finish$/i })).toBeInTheDocument();

    // Step 5 -> Step 4 via Back
    fireEvent.click(within(modal).getByRole("button", { name: /^Back$/i }));
    expect(within(modal).getByText("Step 4 of 5")).toBeInTheDocument();

    // Keyboard ArrowRight on Step 4 pill -> advances back to Step 5
    const step4Pill = within(modal).getByRole("button", {
      name: /Step 4 of 5: Product Check & Ingredient Suitability/i,
    });
    expect(step4Pill).toHaveAttribute("aria-current", "step");
    fireEvent.keyDown(step4Pill, { key: "ArrowRight" });
    expect(within(modal).getByText("Step 5 of 5")).toBeInTheDocument();

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

    const modal = screen.getByRole("dialog");
    fireEvent.click(within(modal).getByRole("button", { name: /^Skip intro$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) || "{}").status
    ).toBe("skipped");

    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    const reopenedByHeader = await screen.findByRole("dialog");
    expect(within(reopenedByHeader).getByText("Step 1 of 5")).toBeInTheDocument();

    fireEvent.click(within(reopenedByHeader).getByRole("button", { name: /^Next$/i }));
    expect(within(reopenedByHeader).getByText("Step 2 of 5")).toBeInTheDocument();
    fireEvent.click(
      within(reopenedByHeader).getByRole("button", { name: /Close onboarding tour/i })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Replay 5-step guided tour/i }));
    const reopenedByFooter = await screen.findByRole("dialog");
    expect(within(reopenedByFooter).getByText("Step 1 of 5")).toBeInTheDocument();

    fireEvent.keyDown(reopenedByFooter, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("connects direct-action shortcuts across Steps 2, 3, 4, and 5 to real studio sections and modals", async () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy,
    });

    render(<DewAndFormExperience />);

    // Step 2 -> "Try Skin Analysis"
    let modal = screen.getByRole("dialog");
    fireEvent.click(within(modal).getByRole("button", { name: /^Next$/i }));
    fireEvent.click(within(modal).getByRole("button", { name: /^Try Skin Analysis$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("analysis-heading");
    });

    // Step 4 -> "Open Product Check"
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    modal = await screen.findByRole("dialog");
    fireEvent.click(
      within(modal).getByRole("button", {
        name: /Step 4 of 5: Product Check & Ingredient Suitability/i,
      })
    );
    fireEvent.click(within(modal).getByRole("button", { name: /Open Product Check/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("product-check-heading");
    });

    // Step 5 -> "Open My Routine"
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    modal = await screen.findByRole("dialog");
    fireEvent.click(
      within(modal).getByRole("button", {
        name: /Step 5 of 5: Build a Simple Skincare Routine/i,
      })
    );
    fireEvent.click(within(modal).getByRole("button", { name: /^Open My Routine$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("my-routine-heading");
    });

    // Step 4 -> "Open Ingredient Explorer"
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    modal = await screen.findByRole("dialog");
    fireEvent.click(
      within(modal).getByRole("button", {
        name: /Step 4 of 5: Product Check & Ingredient Suitability/i,
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
      fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });

  it("pulses 'Take a Tour' on page entry without hover, stops repeating after 6 seconds, and stays functional afterward", () => {
    vi.useFakeTimers();
    writePersistedOnboardingStatus("completed");

    try {
      render(<DewAndFormExperience />);

      const desktopBtn = screen.getByTestId("header-take-tour-desktop");
      const mobileBtn = screen.getByTestId("header-take-tour-mobile");

      // Active immediately on page load without any pointer hover
      expect(desktopBtn).toHaveClass("take-tour-btn");
      expect(mobileBtn).toHaveClass("take-tour-btn");
      expect(desktopBtn).toHaveAttribute("data-entry-glow", "active");
      expect(mobileBtn).toHaveAttribute("data-entry-glow", "active");
      expect(desktopBtn).toHaveAttribute("aria-expanded", "false");

      // Still gently pulsing at 4.5s
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(desktopBtn).toHaveAttribute("data-entry-glow", "active");

      // Automatically stops repeating at 6.0s (within the 5–7s window)
      act(() => {
        vi.advanceTimersByTime(TAKE_TOUR_ENTRY_GLOW_DURATION_MS - 4500);
      });
      expect(desktopBtn).toHaveAttribute("data-entry-glow", "settled");
      expect(mobileBtn).toHaveAttribute("data-entry-glow", "settled");

      // Remains visible, keyboard-focusable, and opens the tour afterward
      desktopBtn.focus();
      expect(document.activeElement).toBe(desktopBtn);

      fireEvent.click(desktopBtn);
      const modal = screen.getByRole("dialog");
      expect(within(modal).getByText("Step 1 of 5")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables the pulsing animation under prefers-reduced-motion while keeping a static highlight and full functionality", async () => {
    writePersistedOnboardingStatus("completed");
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      render(<DewAndFormExperience />);

      const desktopBtn = screen.getByTestId("header-take-tour-desktop");
      const mobileBtn = screen.getByTestId("header-take-tour-mobile");

      expect(desktopBtn).toHaveAttribute("data-entry-glow", "reduced-motion");
      expect(mobileBtn).toHaveAttribute("data-entry-glow", "reduced-motion");

      // Verify CSS contract for sage glow, hover lift, focus-visible ring, and reduced-motion static highlight
      const css = fs.readFileSync(
        path.resolve(process.cwd(), "src/app/globals.css"),
        "utf8"
      );
      expect(css).toContain("@keyframes takeTourEntryGlow");
      expect(css).toContain("brightness(1.035)");
      expect(css).toMatch(/\.take-tour-btn\[data-entry-glow="active"\]\s*\{[^}]*2s[^}]*3 forwards/);
      expect(css).toContain(".take-tour-btn:hover:not(:disabled)");
      expect(css).toContain(".take-tour-btn:focus-visible");
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none\s*!important/);

      // Clicking still opens the onboarding modal cleanly
      fireEvent.click(mobileBtn);
      const modal = await screen.findByRole("dialog");
      expect(within(modal).getByText("Step 1 of 5")).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

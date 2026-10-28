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

describe("Dew & Form interactive first-time user onboarding flow", () => {
  it("shows non-blocking Step 1 onboarding to first-time visitors while keeping main page content accessible", () => {
    render(<DewAndFormExperience />);

    const guide = screen.getByRole("region", {
      name: /Dew & Form guided introduction/i,
    });
    expect(guide).toBeInTheDocument();

    expect(
      within(guide).getByRole("heading", { name: "Welcome to Dew & Form" })
    ).toBeInTheDocument();
    expect(
      within(guide).getByText(
        /Find your skin’s kind of care\. Understand your skin, explore skincare products, and learn what goes into your routine\./i
      )
    ).toBeInTheDocument();
    expect(within(guide).getByText("1 of 4")).toBeInTheDocument();
    expect(within(guide).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(within(guide).getByRole("button", { name: "Get started" })).toBeInTheDocument();
    expect(within(guide).getByRole("button", { name: "Skip intro" })).toBeInTheDocument();

    // Main page hero and workspaces remain non-blocked and accessible simultaneously
    expect(
      screen.getByRole("heading", { name: /Your skin, understood\./i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Begin with a clear daylight portrait\./i })
    ).toBeInTheDocument();
  });

  it("navigates forward and backward across all 4 steps, supports keyboard step arrows, and persists Finish", () => {
    const { unmount } = render(<DewAndFormExperience />);
    const guide = screen.getByRole("region", {
      name: /Dew & Form guided introduction/i,
    });

    // Step 1 -> Step 2 via "Get started"
    fireEvent.click(within(guide).getByRole("button", { name: "Get started" }));
    expect(within(guide).getByText("2 of 4")).toBeInTheDocument();
    expect(
      within(guide).getByRole("heading", { name: "Understand your skin" })
    ).toBeInTheDocument();
    expect(
      within(guide).getByText(/Results depend on the submitted image/i)
    ).toBeInTheDocument();
    expect(within(guide).getByRole("button", { name: /Analyse my skin/i })).toBeInTheDocument();

    // Step 2 -> Step 3 via "Next"
    fireEvent.click(within(guide).getByRole("button", { name: /^Next$/i }));
    expect(within(guide).getByText("3 of 4")).toBeInTheDocument();
    expect(
      within(guide).getByRole("heading", { name: "Discover skincare" })
    ).toBeInTheDocument();
    expect(within(guide).getByRole("button", { name: /Explore products/i })).toBeInTheDocument();

    // Step 3 -> Step 4 via "Next"
    fireEvent.click(within(guide).getByRole("button", { name: /^Next$/i }));
    expect(within(guide).getByText("4 of 4")).toBeInTheDocument();
    expect(
      within(guide).getByRole("heading", { name: "Explore ingredients" })
    ).toBeInTheDocument();
    expect(
      within(guide).getByRole("button", { name: /Explore ingredients/i })
    ).toBeInTheDocument();

    // Step 4 -> Step 3 via "Back"
    fireEvent.click(within(guide).getByRole("button", { name: /^Back$/i }));
    expect(within(guide).getByText("3 of 4")).toBeInTheDocument();

    // Keyboard ArrowRight on step 3 indicator -> moves to step 4
    const step3Pill = within(guide).getByRole("button", {
      name: /Step 3 of 4: Discover skincare/i,
    });
    expect(step3Pill).toHaveAttribute("aria-current", "step");
    fireEvent.keyDown(step3Pill, { key: "ArrowRight" });
    expect(within(guide).getByText("4 of 4")).toBeInTheDocument();

    // Click "Finish" -> closes onboarding and persists completion
    fireEvent.click(within(guide).getByRole("button", { name: /^Finish$/i }));
    expect(
      screen.queryByRole("region", { name: /Dew & Form guided introduction/i })
    ).not.toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) || "{}");
    expect(stored.status).toBe("completed");

    // Simulate returning visit: remount after resetting in-memory cache while preserving localStorage
    unmount();
    resetOnboardingStoreForTests();
    render(<DewAndFormExperience />);
    expect(
      screen.queryByRole("region", { name: /Dew & Form guided introduction/i })
    ).not.toBeInTheDocument();
  });

  it("persists Skip intro dismissal and replays from Step 1 when clicking 'Take a tour'", async () => {
    render(<DewAndFormExperience />);

    const guide = screen.getByRole("region", {
      name: /Dew & Form guided introduction/i,
    });
    fireEvent.click(within(guide).getByRole("button", { name: "Skip intro" }));

    expect(
      screen.queryByRole("region", { name: /Dew & Form guided introduction/i })
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) || "{}").status
    ).toBe("skipped");

    // Replay via header "Take a tour" button
    const takeTourButtons = screen.getAllByRole("button", { name: /Take a tour/i });
    fireEvent.click(takeTourButtons[0]);

    const replayedGuide = await screen.findByRole("region", {
      name: /Dew & Form guided introduction/i,
    });
    expect(within(replayedGuide).getByText("1 of 4")).toBeInTheDocument();
    expect(
      within(replayedGuide).getByRole("heading", { name: "Welcome to Dew & Form" })
    ).toBeInTheDocument();
  });

  it("connects 'Analyse my skin', 'Explore products', and 'Explore ingredients' to real features and guards against duplicate clicks", async () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy,
    });

    render(<DewAndFormExperience />);

    // 1. Step 2 -> "Analyse my skin" connects to #analysis and guards rapid double-click
    let guide = screen.getByRole("region", {
      name: /Dew & Form guided introduction/i,
    });
    fireEvent.click(within(guide).getByRole("button", { name: "Get started" }));

    const analyseCta = within(guide).getByRole("button", { name: /Analyse my skin/i });
    fireEvent.click(analyseCta);
    fireEvent.click(analyseCta);

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("analysis-heading");
    });
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    // 2. Replay -> Step 3 -> "Explore products" connects to #discovery
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    guide = await screen.findByRole("region", {
      name: /Dew & Form guided introduction/i,
    });
    fireEvent.click(
      within(guide).getByRole("button", { name: /Step 3 of 4: Discover skincare/i })
    );
    fireEvent.click(within(guide).getByRole("button", { name: /Explore products/i }));

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("discovery-heading");
    });

    // 3. Replay -> direct feature jump OR Step 4 -> "Explore ingredients" opens real INCI drawer
    fireEvent.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);
    guide = await screen.findByRole("region", {
      name: /Dew & Form guided introduction/i,
    });
    fireEvent.click(
      within(guide).getByRole("button", { name: /Step 4 of 4: INCI literacy/i })
    );
    fireEvent.click(within(guide).getByRole("button", { name: /^Explore ingredients$/i }));

    const inciDialog = await screen.findByRole("dialog");
    expect(
      within(inciDialog).getByRole("heading", { name: /Cosmetic Ingredient Monographs/i })
    ).toBeInTheDocument();
    expect(
      within(inciDialog).getByRole("searchbox", {
        name: /Search documented ingredients/i,
      })
    ).toBeInTheDocument();
  });

  it("allows selecting a workspace directly from Step 1 without completing all tutorial steps first", async () => {
    render(<DewAndFormExperience />);
    const guide = screen.getByRole("region", {
      name: /Dew & Form guided introduction/i,
    });

    // Still on Step 1 ("1 of 4") — click direct "INCI Monographs" shortcut
    expect(within(guide).getByText("1 of 4")).toBeInTheDocument();
    fireEvent.click(within(guide).getByRole("button", { name: /INCI Monographs/i }));

    const inciDialog = await screen.findByRole("dialog");
    expect(
      within(inciDialog).getByRole("heading", { name: /Cosmetic Ingredient Monographs/i })
    ).toBeInTheDocument();
  });

  it("handles unavailable or throwing browser localStorage gracefully without crashing", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    try {
      render(<DewAndFormExperience />);
      const guide = screen.getByRole("region", {
        name: /Dew & Form guided introduction/i,
      });
      expect(guide).toBeInTheDocument();

      // Dismissing does not throw even when Storage.setItem throws SecurityError
      expect(() => {
        fireEvent.click(within(guide).getByRole("button", { name: "Skip intro" }));
      }).not.toThrow();

      expect(
        screen.queryByRole("region", { name: /Dew & Form guided introduction/i })
      ).not.toBeInTheDocument();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });
});

import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { resetOnboardingStoreForTests } from "@/lib/onboarding/storage";

beforeEach(() => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.clear();
    } catch {
      // ignore if mocked to throw
    }
  }
  resetOnboardingStoreForTests();
});

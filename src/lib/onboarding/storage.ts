"use client";

import { useCallback, useSyncExternalStore } from "react";

export const ONBOARDING_STORAGE_KEY = "dew-and-form:onboarding:v1";

export type OnboardingCompletionStatus = "completed" | "skipped";

export interface PersistedOnboardingState {
  version: 1;
  status: OnboardingCompletionStatus;
  updatedAt: string;
}

let memoryFallbackStatus: OnboardingCompletionStatus | null = null;
let clientInitialized = false;
let currentVisibilitySnapshot = false;
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  for (const listener of subscribers) {
    listener();
  }
}

/**
 * Safely reads onboarding completion/dismissal state from browser storage.
 * Falls back gracefully to in-memory session state if `localStorage` is
 * unavailable, blocked by privacy settings, or contains malformed JSON.
 */
export function readPersistedOnboardingStatus(): OnboardingCompletionStatus | null {
  if (typeof window === "undefined") {
    return memoryFallbackStatus;
  }

  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return memoryFallbackStatus;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedOnboardingState> | null;
    if (
      parsed &&
      parsed.version === 1 &&
      (parsed.status === "completed" || parsed.status === "skipped")
    ) {
      memoryFallbackStatus = parsed.status;
      return parsed.status;
    }
  } catch {
    // Storage disabled (e.g. strict privacy mode / SecurityError) or malformed JSON
  }

  return memoryFallbackStatus;
}

/**
 * Safely persists onboarding completion or dismissal without throwing when
 * browser storage is unavailable or quota-constrained.
 */
export function writePersistedOnboardingStatus(status: OnboardingCompletionStatus): void {
  memoryFallbackStatus = status;

  if (typeof window !== "undefined") {
    try {
      const payload: PersistedOnboardingState = {
        version: 1,
        status,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Graceful fallback: memoryFallbackStatus still prevents duplicate prompts in-session
    }
  }
}

function ensureClientInitialized(): void {
  if (clientInitialized || typeof window === "undefined") {
    return;
  }
  clientInitialized = true;
  const persisted = readPersistedOnboardingStatus();
  currentVisibilitySnapshot = persisted === null;
}

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === ONBOARDING_STORAGE_KEY) {
      const persisted = readPersistedOnboardingStatus();
      const nextVisible = persisted === null;
      if (currentVisibilitySnapshot !== nextVisible) {
        currentVisibilitySnapshot = nextVisible;
        notifySubscribers();
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }

  return () => {
    subscribers.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function getClientSnapshot(): boolean {
  ensureClientInitialized();
  return currentVisibilitySnapshot;
}

function getServerSnapshot(): boolean {
  return false;
}

export function dismissOnboardingWithStatus(status: OnboardingCompletionStatus): void {
  ensureClientInitialized();
  writePersistedOnboardingStatus(status);
  if (currentVisibilitySnapshot !== false) {
    currentVisibilitySnapshot = false;
    notifySubscribers();
  }
}

export function openOnboardingReplay(): void {
  ensureClientInitialized();
  if (currentVisibilitySnapshot !== true) {
    currentVisibilitySnapshot = true;
    notifySubscribers();
  }
}

/**
 * Hook managing non-blocking first-visit onboarding visibility, persistence, and replay.
 */
export function useOnboardingVisibility() {
  const isOpen = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const completeOnboarding = useCallback(() => {
    dismissOnboardingWithStatus("completed");
  }, []);

  const skipOnboarding = useCallback(() => {
    dismissOnboardingWithStatus("skipped");
  }, []);

  const replayOnboarding = useCallback(() => {
    openOnboardingReplay();
  }, []);

  return {
    isOpen,
    completeOnboarding,
    skipOnboarding,
    replayOnboarding,
  };
}

/**
 * Resets module state between automated tests so each test controls storage cleanly.
 */
export function resetOnboardingStoreForTests(): void {
  memoryFallbackStatus = null;
  clientInitialized = false;
  currentVisibilitySnapshot = false;
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { SkincareProduct } from "@/lib/ingredients/types";
import {
  DEFAULT_PERSONAL_PROFILE,
  type ProductCheckPersonalProfile,
} from "@/lib/product-check/types";
import type { RoutineTimeSlot } from "./compatibility";

export const ROUTINE_STORAGE_KEY = "dew-and-form:routine:v1";

export interface PersistedRoutineAndProfileState {
  version: 1;
  morningProducts: SkincareProduct[];
  eveningProducts: SkincareProduct[];
  personalProfile: ProductCheckPersonalProfile;
  updatedAt: string | null;
}

const INITIAL_STATE: PersistedRoutineAndProfileState = {
  version: 1,
  morningProducts: [],
  eveningProducts: [],
  personalProfile: DEFAULT_PERSONAL_PROFILE,
  updatedAt: null,
};

let memoryState: PersistedRoutineAndProfileState = INITIAL_STATE;
let clientHydrated = false;
const subscribers = new Set<() => void>();

function notify(): void {
  for (const fn of subscribers) {
    fn();
  }
}

function sanitizeProductForStorage(product: SkincareProduct): SkincareProduct {
  return {
    ...product,
    // Never persist ephemeral blob: URLs across browser sessions
    imageUrl:
      product.imageUrl && product.imageUrl.startsWith("blob:")
        ? null
        : product.imageUrl ?? null,
  };
}

function readFromStorage(): PersistedRoutineAndProfileState {
  if (typeof window === "undefined") {
    return memoryState;
  }

  try {
    const raw = window.localStorage.getItem(ROUTINE_STORAGE_KEY);
    if (!raw) {
      return memoryState;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedRoutineAndProfileState> | null;
    if (parsed && parsed.version === 1) {
      const next: PersistedRoutineAndProfileState = {
        version: 1,
        morningProducts: Array.isArray(parsed.morningProducts)
          ? parsed.morningProducts.slice(0, 8)
          : [],
        eveningProducts: Array.isArray(parsed.eveningProducts)
          ? parsed.eveningProducts.slice(0, 8)
          : [],
        personalProfile: {
          ...DEFAULT_PERSONAL_PROFILE,
          ...(parsed.personalProfile || {}),
          goals: Array.isArray(parsed.personalProfile?.goals)
            ? parsed.personalProfile.goals
            : [],
          sensitivities: Array.isArray(parsed.personalProfile?.sensitivities)
            ? parsed.personalProfile.sensitivities
            : [],
        },
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      };
      memoryState = next;
      return next;
    }
  } catch {
    // Graceful fallback when localStorage is blocked or malformed
  }

  return memoryState;
}

function persistState(next: PersistedRoutineAndProfileState): void {
  memoryState = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep in-memory state working seamlessly if storage throws
    }
  }
  notify();
}

function ensureHydrated(): void {
  if (clientHydrated || typeof window === "undefined") return;
  clientHydrated = true;
  memoryState = readFromStorage();
}

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === ROUTINE_STORAGE_KEY) {
      memoryState = readFromStorage();
      notify();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    subscribers.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getClientSnapshot(): PersistedRoutineAndProfileState {
  ensureHydrated();
  return memoryState;
}

function getServerSnapshot(): PersistedRoutineAndProfileState {
  return INITIAL_STATE;
}

export function useSavedRoutineAndProfile() {
  const snapshot = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const addProductToRoutine = useCallback(
    (product: SkincareProduct, slot: RoutineTimeSlot | "both") => {
      ensureHydrated();
      const clean = sanitizeProductForStorage(product);
      const nextMorning =
        slot === "morning" || slot === "both"
          ? memoryState.morningProducts.some((p) => p.id === clean.id)
            ? memoryState.morningProducts
            : [...memoryState.morningProducts, clean].slice(0, 8)
          : memoryState.morningProducts;

      const nextEvening =
        slot === "evening" || slot === "both"
          ? memoryState.eveningProducts.some((p) => p.id === clean.id)
            ? memoryState.eveningProducts
            : [...memoryState.eveningProducts, clean].slice(0, 8)
          : memoryState.eveningProducts;

      persistState({
        ...memoryState,
        morningProducts: nextMorning,
        eveningProducts: nextEvening,
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  const removeProductFromRoutine = useCallback(
    (productId: string, slot: RoutineTimeSlot) => {
      ensureHydrated();
      persistState({
        ...memoryState,
        morningProducts:
          slot === "morning"
            ? memoryState.morningProducts.filter((p) => p.id !== productId)
            : memoryState.morningProducts,
        eveningProducts:
          slot === "evening"
            ? memoryState.eveningProducts.filter((p) => p.id !== productId)
            : memoryState.eveningProducts,
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  const updatePersonalProfile = useCallback(
    (
      updater:
        | Partial<ProductCheckPersonalProfile>
        | ((prev: ProductCheckPersonalProfile) => ProductCheckPersonalProfile)
    ) => {
      ensureHydrated();
      const nextProfile =
        typeof updater === "function"
          ? updater(memoryState.personalProfile)
          : { ...memoryState.personalProfile, ...updater };

      persistState({
        ...memoryState,
        personalProfile: nextProfile,
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  const clearSavedRoutineAndProfile = useCallback(() => {
    memoryState = INITIAL_STATE;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(ROUTINE_STORAGE_KEY);
      } catch {
        // ignore if storage blocked
      }
    }
    notify();
  }, []);

  return {
    morningProducts: snapshot.morningProducts,
    eveningProducts: snapshot.eveningProducts,
    personalProfile: snapshot.personalProfile,
    updatedAt: snapshot.updatedAt,
    addProductToRoutine,
    removeProductFromRoutine,
    updatePersonalProfile,
    clearSavedRoutineAndProfile,
  };
}

export function resetRoutineStoreForTests(): void {
  memoryState = INITIAL_STATE;
  clientHydrated = false;
}

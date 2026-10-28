"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, FlaskConical, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildYouCamDevelopmentFixture, type FixturePresetId } from "@/fixtures/youcam-fixtures";
import { REFERENCE_FORMULATION_FIXTURES } from "@/fixtures/reference-formulations";
import { YOUCAM_TIMING_CONFIG } from "@/lib/youcam/config";
import { CONCERN_METADATA, type CareFocusTheme } from "@/lib/youcam/metadata";
import type {
  AnalysisApiEnvelope,
  AnalysisMode,
  NormalizedSkinAnalysisResult,
  StructuredAnalysisError,
} from "@/lib/youcam/types";
import type { FormulationCategory, SkincareProduct } from "@/lib/ingredients/types";

import { BrandHeader } from "./BrandHeader";
import { OnboardingTour } from "./OnboardingTour";
import { EditorialHero } from "./EditorialHero";
import { useOnboardingVisibility } from "@/lib/onboarding/storage";
import { ApproachSection } from "./ApproachSection";
import { SkinImageUploader, type SelectedSkinImage } from "./SkinImageUploader";
import { AnalysisProgress } from "./AnalysisProgress";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { SkinResultsPanel } from "./SkinResultsPanel";
import { ProductDiscoverySection } from "./ProductDiscoverySection";
import { ProductComparison } from "./ProductComparison";
import { IngredientDetails } from "./IngredientDetails";
import { FormulaShelfModal } from "./FormulaShelfModal";

type WorkflowStatus = "idle" | "submitting" | "polling" | "success" | "error";

interface ResumableTaskRef {
  taskId: string;
  publicRef: string;
  pollAfterMs: number;
}

function waitAbortable(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

export function DewAndFormExperience() {
  // Non-blocking first-visit onboarding & replay state
  const {
    isOpen: isOnboardingOpen,
    completeOnboarding,
    skipOnboarding,
    replayOnboarding,
  } = useOnboardingVisibility();
  const [onboardingReplayGeneration, setOnboardingReplayGeneration] = useState(0);

  // Server status
  const [liveApiConfigured, setLiveApiConfigured] = useState<boolean | null>(null);

  // Skin Analysis state
  const [mode, setMode] = useState<AnalysisMode>("sd");
  const [selectedImage, setSelectedImage] = useState<SelectedSkinImage | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("idle");
  const [activePublicRef, setActivePublicRef] = useState<string | null>(null);
  const [resumableTask, setResumableTask] = useState<ResumableTaskRef | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [analysisError, setAnalysisError] = useState<StructuredAnalysisError | null>(null);
  const [analysisResult, setAnalysisResult] = useState<NormalizedSkinAnalysisResult | null>(null);
  const [analysedPortraitUrl, setAnalysedPortraitUrl] = useState<string | null>(null);
  const [qaDrawerOpen, setQaDrawerOpen] = useState(false);

  // Care Focus Preferences & Step Category Filter
  const [selectedThemes, setSelectedThemes] = useState<CareFocusTheme[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"All" | FormulationCategory>("All");

  // Product Discovery, Open Beauty Facts Registry, Shelf & Comparison state
  const [connectedProducts, setConnectedProducts] = useState<SkincareProduct[]>([]);
  const [cachedRegistryById, setCachedRegistryById] = useState<Record<string, SkincareProduct>>({});
  const [registryConnected, setRegistryConnected] = useState<boolean | null>(null);
  const [registryLoading, setRegistryLoading] = useState<boolean>(true);
  const [activeRegistryQuery, setActiveRegistryQuery] = useState<string | null>(null);
  const [userShelfProducts, setUserShelfProducts] = useState<SkincareProduct[]>([]);
  const [showReferenceFixtures, setShowReferenceFixtures] = useState(false);
  const [comparedIds, setComparedIds] = useState<string[]>([]);

  // Modals / Drawers
  const [shelfModalOpen, setShelfModalOpen] = useState(false);
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [inspectedProduct, setInspectedProduct] = useState<SkincareProduct | null>(null);
  const [inspectedIngredientName, setInspectedIngredientName] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const registryAbortRef = useRef<AbortController | null>(null);

  // Load server capability status and Open Beauty Facts registry feed using relative URLs
  useEffect(() => {
    let mounted = true;

    async function fetchInitialState() {
      try {
        const [statusRes, productsRes] = await Promise.all([
          fetch("/api/skin-analysis/status", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
        ]);

        if (mounted && statusRes.ok) {
          const data = (await statusRes.json()) as { liveApiConfigured?: boolean };
          setLiveApiConfigured(Boolean(data.liveApiConfigured));
        }

        if (mounted && productsRes.ok) {
          const prodData = (await productsRes.json()) as {
            connected?: boolean;
            products?: SkincareProduct[];
          };
          const isConnected = Boolean(prodData.connected);
          const items = Array.isArray(prodData.products) ? prodData.products : [];
          setRegistryConnected(isConnected);
          setConnectedProducts(items);
          if (items.length > 0) {
            setCachedRegistryById((prev) => {
              const next = { ...prev };
              for (const item of items) {
                next[item.id] = item;
              }
              return next;
            });
          } else if (!isConnected) {
            // Graceful fallback when Open Beauty Facts is unreachable (e.g. offline network)
            setShowReferenceFixtures(true);
          }
        } else if (mounted) {
          setRegistryConnected(false);
          setShowReferenceFixtures(true);
        }
      } catch {
        if (mounted) {
          setRegistryConnected(false);
          setShowReferenceFixtures(true);
        }
      } finally {
        if (mounted) {
          setRegistryLoading(false);
        }
      }
    }

    void fetchInitialState();
    return () => {
      mounted = false;
      abortRef.current?.abort();
      registryAbortRef.current?.abort();
    };
  }, []);

  const fetchRegistryFeed = useCallback(
    async (opts: { query?: string | null; themes?: CareFocusTheme[] }) => {
      const trimmedQuery = opts.query?.trim() || "";
      const themesParam = (opts.themes ?? []).join(",");

      registryAbortRef.current?.abort();
      const controller = new AbortController();
      registryAbortRef.current = controller;

      setRegistryLoading(true);
      setActiveRegistryQuery(trimmedQuery || null);

      try {
        const searchParams = new URLSearchParams();
        if (trimmedQuery) {
          searchParams.set("q", trimmedQuery);
        } else if (themesParam) {
          searchParams.set("themes", themesParam);
        }
        const qs = searchParams.toString();
        const endpoint = qs ? `/api/products?${qs}` : "/api/products";

        const res = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (res.ok) {
          const data = (await res.json()) as {
            connected?: boolean;
            products?: SkincareProduct[];
          };
          const isConnected = Boolean(data.connected);
          const items = Array.isArray(data.products) ? data.products : [];
          setRegistryConnected(isConnected);
          setConnectedProducts(items);
          if (items.length > 0) {
            setCachedRegistryById((prev) => {
              const next = { ...prev };
              for (const item of items) {
                next[item.id] = item;
              }
              return next;
            });
          } else if (!isConnected) {
            setShowReferenceFixtures(true);
          }
        } else {
          setRegistryConnected(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setRegistryConnected(false);
      } finally {
        if (!controller.signal.aborted) {
          setRegistryLoading(false);
        }
      }
    },
    []
  );

  const handleSearchRegistry = useCallback(
    (rawQuery: string) => {
      void fetchRegistryFeed({ query: rawQuery, themes: selectedThemes });
    },
    [fetchRegistryFeed, selectedThemes]
  );

  const suggestThemesFromResult = useCallback(
    (res: NormalizedSkinAnalysisResult) => {
      const lowest = [...res.metrics]
        .filter((m) => (m.uiScore ?? m.rawScore) !== null)
        .sort((a, b) => (a.uiScore ?? a.rawScore ?? 100) - (b.uiScore ?? b.rawScore ?? 100))
        .slice(0, 2);

      const suggested = Array.from(
        new Set<CareFocusTheme>(
          lowest.flatMap((m) => CONCERN_METADATA[m.key].relatedThemes.slice(0, 1))
        )
      );
      setSelectedThemes(suggested);
      if (!activeRegistryQuery) {
        void fetchRegistryFeed({ query: null, themes: suggested });
      }
    },
    [activeRegistryQuery, fetchRegistryFeed]
  );

  const cancelOngoingAnalysis = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setWorkflowStatus("idle");
    setPollCount(0);
  }, []);

  /**
   * Polls an existing server-issued `taskId` with gentle backoff, overall timeout protection,
   * and transient error resilience — never creating duplicate paid YouCam tasks on poll failure.
   */
  const pollExistingTask = useCallback(
    async (
      taskRef: ResumableTaskRef,
      portraitPreviewUrl: string | null,
      controller: AbortController
    ) => {
      const deadlineMs = Date.now() + YOUCAM_TIMING_CONFIG.overallPollTimeoutMs;
      let attempt = 0;
      let consecutiveTransientFailures = 0;
      let nextDelayMs = Math.max(250, taskRef.pollAfterMs || YOUCAM_TIMING_CONFIG.initialPollIntervalMs);

      setActivePublicRef(taskRef.publicRef);
      setWorkflowStatus("polling");

      while (Date.now() < deadlineMs) {
        if (controller.signal.aborted) return;

        await waitAbortable(nextDelayMs, controller.signal);
        if (controller.signal.aborted) return;

        attempt += 1;
        setPollCount(attempt);

        let pollRes: Response;
        try {
          const perRequestController = new AbortController();
          const onParentAbort = () => perRequestController.abort();
          controller.signal.addEventListener("abort", onParentAbort, { once: true });
          const reqTimer = window.setTimeout(
            () => perRequestController.abort(),
            YOUCAM_TIMING_CONFIG.clientRequestTimeoutMs
          );

          try {
            pollRes = await fetch(
              `/api/skin-analysis/${encodeURIComponent(taskRef.taskId)}`,
              {
                method: "GET",
                cache: "no-store",
                credentials: "same-origin",
                signal: perRequestController.signal,
              }
            );
          } finally {
            window.clearTimeout(reqTimer);
            controller.signal.removeEventListener("abort", onParentAbort);
          }
        } catch (err) {
          if (controller.signal.aborted) {
            throw err;
          }
          consecutiveTransientFailures += 1;
          if (consecutiveTransientFailures <= YOUCAM_TIMING_CONFIG.maxTransientPollRetries) {
            nextDelayMs = Math.min(YOUCAM_TIMING_CONFIG.maxPollIntervalMs, nextDelayMs + 1500);
            continue;
          }

          setResumableTask(taskRef);
          setAnalysisError({
            category: "network",
            code: "POLL_CONNECTION_INTERRUPTED",
            title: "Connection interrupted while checking task status",
            message:
              "Your skin analysis task was already submitted, so no duplicate request was sent. Check status again once your connection stabilizes.",
          });
          setWorkflowStatus("error");
          return;
        }

        let envelope: AnalysisApiEnvelope | null = null;
        try {
          envelope = (await pollRes.json()) as AnalysisApiEnvelope;
        } catch {
          envelope = null;
        }

        // Transient upstream gateway/timeout errors: retry polling the SAME task before failing
        if (pollRes.status === 502 || pollRes.status === 503 || pollRes.status === 504) {
          consecutiveTransientFailures += 1;
          if (consecutiveTransientFailures <= YOUCAM_TIMING_CONFIG.maxTransientPollRetries) {
            nextDelayMs = Math.min(YOUCAM_TIMING_CONFIG.maxPollIntervalMs, nextDelayMs + 1500);
            continue;
          }

          const fallbackErr =
            envelope && envelope.status === "error"
              ? envelope.error
              : {
                  category: pollRes.status === 504 ? ("timeout" as const) : ("network" as const),
                  code: `HTTP_${pollRes.status}`,
                  title: "Temporary status check interruption",
                  message:
                    "Could not reach YouCam to confirm task completion. Resume checking status without creating a duplicate task.",
                };

          setResumableTask(taskRef);
          setAnalysisError(fallbackErr);
          setWorkflowStatus("error");
          return;
        }

        consecutiveTransientFailures = 0;

        if (!pollRes.ok) {
          const errPayload =
            envelope && envelope.status === "error"
              ? envelope.error
              : {
                  category:
                    pollRes.status === 429
                      ? ("rate_limited" as const)
                      : pollRes.status === 403
                        ? ("unauthorized" as const)
                        : pollRes.status === 410
                          ? ("expired" as const)
                          : ("api_failure" as const),
                  code: `HTTP_${pollRes.status}`,
                  title: "Unable to check analysis status",
                  message: "The server rejected the task status check.",
                };

          if (pollRes.status === 429) {
            setResumableTask(taskRef);
          } else {
            setResumableTask(null);
          }
          setAnalysisError(errPayload);
          setWorkflowStatus("error");
          return;
        }

        if (!envelope || typeof envelope.status !== "string") {
          setResumableTask(null);
          setAnalysisError({
            category: "api_failure",
            code: "MALFORMED_STATUS_ENVELOPE",
            title: "Unexpected server response",
            message: "Received an unrecognized status format while checking your analysis.",
          });
          setWorkflowStatus("error");
          return;
        }

        if (envelope.status === "processing") {
          const suggested = envelope.pollAfterMs || YOUCAM_TIMING_CONFIG.initialPollIntervalMs;
          nextDelayMs = Math.min(
            YOUCAM_TIMING_CONFIG.maxPollIntervalMs,
            Math.max(suggested, nextDelayMs + (attempt >= 3 ? 1000 : 0))
          );
          continue;
        }

        if (envelope.status === "error") {
          // Definitive YouCam engine error on this image — clear resumableTask so retry uses a fresh photo/submission
          setResumableTask(null);
          setAnalysisError(envelope.error);
          setWorkflowStatus("error");
          return;
        }

        if (envelope.status === "success" && envelope.result) {
          setResumableTask(null);
          setAnalysisResult(envelope.result);
          setAnalysedPortraitUrl(portraitPreviewUrl);
          suggestThemesFromResult(envelope.result);
          setWorkflowStatus("success");

          window.requestAnimationFrame(() => {
            document.getElementById("insights")?.scrollIntoView({ behavior: "smooth" });
          });
          return;
        }
      }

      // Overall polling deadline reached: preserve task reference so user can re-check without re-uploading
      setResumableTask(taskRef);
      setAnalysisError({
        category: "timeout",
        code: "POLL_TIMEOUT",
        title: "Analysis is taking longer than expected",
        message:
          "Your portrait was submitted, but YouCam v2.1 remained in processing state past our 90-second wait window. You can check status again without submitting a duplicate request.",
      });
      setWorkflowStatus("error");
    },
    [suggestThemesFromResult]
  );

  const handleResumePolling = useCallback(async () => {
    if (!resumableTask || inFlightRef.current) return;

    inFlightRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnalysisError(null);
    setPollCount(0);

    try {
      await pollExistingTask(
        resumableTask,
        selectedImage?.previewUrl ?? null,
        controller
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setAnalysisError({
        category: "network",
        code: "CLIENT_FETCH_ERROR",
        title: "Connection interrupted",
        message: "A network error occurred while checking your existing analysis task.",
      });
      setWorkflowStatus("error");
    } finally {
      inFlightRef.current = false;
    }
  }, [pollExistingTask, resumableTask, selectedImage]);

  const handleSubmitAnalysis = useCallback(async () => {
    if (!selectedImage || !selectedImage.validation.valid || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnalysisError(null);
    setResumableTask(null);
    setWorkflowStatus("submitting");
    setActivePublicRef(null);
    setPollCount(0);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage.file);
      formData.append("mode", mode);

      const submitRes = await fetch("/api/skin-analysis", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        signal: controller.signal,
      });

      let submitJson: AnalysisApiEnvelope | null = null;
      try {
        submitJson = (await submitRes.json()) as AnalysisApiEnvelope;
      } catch {
        submitJson = null;
      }

      if (!submitRes.ok || !submitJson || submitJson.status !== "processing") {
        const errPayload: StructuredAnalysisError =
          submitJson && submitJson.status === "error"
            ? submitJson.error
            : {
                category: submitRes.status === 429 ? "rate_limited" : "api_failure",
                code: `HTTP_${submitRes.status}`,
                title: "Unable to initiate analysis",
                message: "The server could not start the YouCam v2.1 analysis task.",
              };

        setAnalysisError(errPayload);
        setWorkflowStatus("error");
        return;
      }

      const taskRef: ResumableTaskRef = {
        taskId: submitJson.taskId,
        publicRef: submitJson.publicRef,
        pollAfterMs: submitJson.pollAfterMs || YOUCAM_TIMING_CONFIG.initialPollIntervalMs,
      };

      await pollExistingTask(taskRef, selectedImage.previewUrl, controller);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setAnalysisError({
        category: "network",
        code: "CLIENT_FETCH_ERROR",
        title: "Connection interrupted",
        message: "A network error occurred while communicating with the Dew & Form server.",
      });
      setWorkflowStatus("error");
    } finally {
      inFlightRef.current = false;
    }
  }, [mode, pollExistingTask, selectedImage]);

  const handleLoadFixture = useCallback(
    (preset: FixturePresetId) => {
      cancelOngoingAnalysis();
      setResumableTask(null);
      setAnalysisError(null);
      const fixture = buildYouCamDevelopmentFixture(preset);
      setAnalysisResult(fixture);
      // Never pass user's unanalysed preview as an analysed portrait in fixture mode
      setAnalysedPortraitUrl(null);
      suggestThemesFromResult(fixture);
      setWorkflowStatus("success");

      window.requestAnimationFrame(() => {
        document.getElementById("insights")?.scrollIntoView({ behavior: "smooth" });
      });
    },
    [cancelOngoingAnalysis, suggestThemesFromResult]
  );

  const handlePreviewErrorState = useCallback(
    (kind: "rate_limit" | "expired" | "framing") => {
      cancelOngoingAnalysis();
      setResumableTask(null);
      if (kind === "rate_limit") {
        setAnalysisError({
          category: "rate_limited",
          code: "TooManyRequests_Preview",
          title: "Analysis service is temporarily rate-limited",
          message:
            "State preview: Too many skin analysis requests were received in a brief window. Retry unlocks once cooldown completes.",
          retryAfterSeconds: 12,
        });
      } else if (kind === "expired") {
        setAnalysisError({
          category: "expired",
          code: "InvalidOrExpiredTask_Preview",
          title: "Analysis result has expired",
          message:
            "State preview: YouCam retains temporary result mask URLs for approximately 2 hours. Start a fresh scan to view updated overlays.",
        });
      } else {
        setAnalysisError({
          category: "image_quality",
          code: "error_src_face_too_small",
          title: "Face appears too distant in the frame",
          message:
            "State preview: YouCam requires the face width to occupy roughly 60–80% of the image width so surface details can be read accurately.",
          guidance: [
            "Move closer to the camera or crop wide background margins.",
            "Face a window with soft, even natural daylight.",
          ],
        });
      }
      setWorkflowStatus("error");
    },
    [cancelOngoingAnalysis]
  );

  const handleResetAnalysis = useCallback(() => {
    cancelOngoingAnalysis();
    setResumableTask(null);
    setActivePublicRef(null);
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalysedPortraitUrl(null);
    setWorkflowStatus("idle");
    document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth" });
  }, [cancelOngoingAnalysis]);

  const handleToggleTheme = useCallback(
    (theme: CareFocusTheme) => {
      const nextThemes = selectedThemes.includes(theme)
        ? selectedThemes.filter((t) => t !== theme)
        : [...selectedThemes, theme];

      setSelectedThemes(nextThemes);
      if (!activeRegistryQuery) {
        void fetchRegistryFeed({ query: null, themes: nextThemes });
      }
    },
    [activeRegistryQuery, fetchRegistryFeed, selectedThemes]
  );

  const allAvailableProducts = useMemo(() => {
    const map = new Map<string, SkincareProduct>();
    for (const p of Object.values(cachedRegistryById)) map.set(p.id, p);
    for (const p of connectedProducts) map.set(p.id, p);
    for (const p of userShelfProducts) map.set(p.id, p);
    for (const p of REFERENCE_FORMULATION_FIXTURES) map.set(p.id, p);
    return Array.from(map.values());
  }, [cachedRegistryById, connectedProducts, userShelfProducts]);

  const comparedProducts = useMemo(() => {
    return comparedIds
      .map((id) => allAvailableProducts.find((p) => p.id === id))
      .filter((p): p is SkincareProduct => Boolean(p));
  }, [comparedIds, allAvailableProducts]);

  const handleToggleCompare = useCallback((productId: string) => {
    setComparedIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, productId];
    });
  }, []);

  const handleInspectProduct = useCallback(
    (product: SkincareProduct | null, initialIngredient?: string) => {
      setInspectedProduct(product);
      setInspectedIngredientName(initialIngredient ?? null);
      setIngredientModalOpen(true);
    },
    []
  );

  const handleAddShelfProduct = useCallback((product: SkincareProduct) => {
    setUserShelfProducts((prev) => [product, ...prev]);
  }, []);

  const scrollAndFocusSection = useCallback((sectionId: string, headingId?: string) => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sectionEl = document.getElementById(sectionId);
    sectionEl?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });

    if (headingId) {
      const headingEl = document.getElementById(headingId);
      headingEl?.focus({ preventScroll: true });
    }
  }, []);

  const handleTakeTour = useCallback(() => {
    setOnboardingReplayGeneration((prev) => prev + 1);
    replayOnboarding();
    window.requestAnimationFrame(() => {
      scrollAndFocusSection("onboarding-guide", "onboarding-step-heading");
    });
  }, [replayOnboarding, scrollAndFocusSection]);

  const handleOnboardingToAnalysis = useCallback(() => {
    completeOnboarding();
    window.requestAnimationFrame(() => {
      scrollAndFocusSection("analysis", "analysis-heading");
    });
  }, [completeOnboarding, scrollAndFocusSection]);

  const handleOnboardingToDiscovery = useCallback(() => {
    completeOnboarding();
    window.requestAnimationFrame(() => {
      scrollAndFocusSection("discovery", "discovery-heading");
    });
  }, [completeOnboarding, scrollAndFocusSection]);

  const handleOnboardingToComparison = useCallback(() => {
    completeOnboarding();
    window.requestAnimationFrame(() => {
      scrollAndFocusSection("comparison", "comparison-heading");
    });
  }, [completeOnboarding, scrollAndFocusSection]);

  const handleOnboardingToIngredients = useCallback(() => {
    completeOnboarding();
    scrollAndFocusSection("discovery");
    handleInspectProduct(null);
  }, [completeOnboarding, handleInspectProduct, scrollAndFocusSection]);

  const isBusy = workflowStatus === "submitting" || workflowStatus === "polling";

  const retryAction = resumableTask
    ? handleResumePolling
    : selectedImage?.validation.valid
      ? handleSubmitAnalysis
      : undefined;

  const retryActionLabel = resumableTask ? "Check status again" : "Retry analysis";

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <BrandHeader
        hasResults={Boolean(analysisResult)}
        compareCount={comparedProducts.length}
        isTourOpen={isOnboardingOpen}
        onTakeTour={handleTakeTour}
      />

      <main id="main-content" className="flex-1">
        {/* Guided First-Visit Studio Introduction (non-blocking, dismissible & replayable) */}
        {isOnboardingOpen && (
          <OnboardingTour
            key={onboardingReplayGeneration}
            replayGeneration={onboardingReplayGeneration}
            onSkip={skipOnboarding}
            onFinish={completeOnboarding}
            onNavigateToAnalysis={handleOnboardingToAnalysis}
            onNavigateToDiscovery={handleOnboardingToDiscovery}
            onNavigateToComparison={handleOnboardingToComparison}
            onOpenIngredientsWorkspace={handleOnboardingToIngredients}
          />
        )}

        {/* A. Brand Landing Hero */}
        <EditorialHero />

        {/* Approach & Methodology Spread */}
        <ApproachSection />

        {/* B & C. Skin Analysis Workspace + Progress & Error States */}
        <section
          id="analysis"
          aria-labelledby="analysis-heading"
          className="border-b border-stone-border bg-canvas py-16 sm:py-20 lg:py-24"
        >
          <div className="editorial-container">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Editorial Guidance Column (5 cols) */}
              <div className="space-y-6 lg:col-span-5">
                <div>
                  <p className="eyebrow-label text-sage-botanical">Skin Analysis Workspace</p>
                  <h2
                    id="analysis-heading"
                    tabIndex={-1}
                    className="mt-2.5 font-serif text-display-md font-normal text-ink focus:outline-none"
                  >
                    Begin with a clear daylight portrait.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-base">
                    YouCam AI Skin Analysis v2.1 evaluates visible complexion characteristics from a
                    single front-facing photograph using a focused, verified action set.
                  </p>
                </div>

                {/* Capture Preparation Checklist */}
                <div className="rounded-editorial border border-stone-border bg-surface p-5">
                  <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-secondary">
                    Preparation for reliable readings
                  </h3>
                  <ul className="mt-3.5 space-y-2.5 text-xs leading-relaxed text-ink-secondary">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 font-mono text-[11px] text-forest">01</span>
                      <span>
                        <strong className="font-medium text-ink">Even front light:</strong> Face a
                        window or diffused daylight source; avoid strong overhead or side shadows.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 font-mono text-[11px] text-forest">02</span>
                      <span>
                        <strong className="font-medium text-ink">Unobstructed forehead &amp; cheeks:</strong>{" "}
                        Brush hair back from your forehead and remove spectacles if comfortable.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 font-mono text-[11px] text-forest">03</span>
                      <span>
                        <strong className="font-medium text-ink">60–80% frame width:</strong> Keep
                        your face centered, looking straight ahead with a relaxed expression.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 font-mono text-[11px] text-forest">04</span>
                      <span>
                        <strong className="font-medium text-ink">Clean skin when practical:</strong>{" "}
                        Foundation or tinted sunscreen masks natural tone and pore cues.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Clearly Isolated Development Fixture & State Inspector */}
                <Collapsible.Root
                  open={qaDrawerOpen}
                  onOpenChange={setQaDrawerOpen}
                  className="rounded-editorial border border-stone-border bg-surface"
                >
                  <Collapsible.Trigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-medium text-ink-secondary transition-colors hover:text-ink"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FlaskConical className="h-3.5 w-3.5 text-clay" aria-hidden="true" />
                        <span>Development Fixture &amp; State Preview</span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          qaDrawerOpen && "rotate-180"
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </Collapsible.Trigger>

                  <Collapsible.Content className="border-t border-stone-border px-4 py-4 text-xs text-ink-secondary">
                    <p className="leading-relaxed">
                      Inspect documented YouCam JSON payloads and application error states without
                      consuming live API units. All fixture outputs are explicitly labeled and kept
                      separate from live scans.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadFixture("hd-comprehensive")}
                        className="rounded-editorial border border-stone-strong bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-sage-soft/60"
                      >
                        Load HD Multi-Zone Fixture
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadFixture("sd-partial")}
                        className="rounded-editorial border border-stone-strong bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-sage-soft/60"
                      >
                        Load Partial 4-Metric SD Fixture
                      </button>
                    </div>

                    <div className="mt-3 border-t border-stone-border pt-3">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        Error &amp; Edge State Previews
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePreviewErrorState("rate_limit")}
                          className="rounded-editorial border border-stone-border bg-canvas px-2.5 py-1 text-[11px] text-ink-secondary hover:text-ink"
                        >
                          Rate limit (429)
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreviewErrorState("expired")}
                          className="rounded-editorial border border-stone-border bg-canvas px-2.5 py-1 text-[11px] text-ink-secondary hover:text-ink"
                        >
                          Expired result
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreviewErrorState("framing")}
                          className="rounded-editorial border border-stone-border bg-canvas px-2.5 py-1 text-[11px] text-ink-secondary hover:text-ink"
                        >
                          Face distance error
                        </button>
                      </div>
                    </div>
                  </Collapsible.Content>
                </Collapsible.Root>
              </div>

              {/* Right Interactive Uploader / Progress / Error Column (7 cols) */}
              <div className="space-y-6 lg:col-span-7">
                {isBusy && (
                  <AnalysisProgress
                    stage={workflowStatus === "submitting" ? "submitting" : "polling"}
                    mode={mode}
                    publicRef={activePublicRef}
                    pollCount={pollCount}
                    onCancel={cancelOngoingAnalysis}
                  />
                )}

                {workflowStatus === "error" && analysisError && (
                  <ErrorState
                    key={`${analysisError.category}-${analysisError.code}`}
                    error={analysisError}
                    onRetry={retryAction}
                    retryLabel={retryActionLabel}
                    onReset={() => {
                      setResumableTask(null);
                      setActivePublicRef(null);
                      setAnalysisError(null);
                      setWorkflowStatus("idle");
                    }}
                    onLoadFixture={() => handleLoadFixture("hd-comprehensive")}
                  />
                )}

                <SkinImageUploader
                  mode={mode}
                  onModeChange={(nextMode) => {
                    setMode(nextMode);
                    setResumableTask(null);
                  }}
                  selectedImage={selectedImage}
                  onImageChange={(next) => {
                    setSelectedImage(next);
                    setResumableTask(null);
                    if (analysisError?.category === "validation") {
                      setAnalysisError(null);
                      setWorkflowStatus("idle");
                    }
                  }}
                  onSubmitAnalysis={handleSubmitAnalysis}
                  isBusy={isBusy}
                  liveApiConfigured={liveApiConfigured}
                />
              </div>
            </div>
          </div>
        </section>

        {/* D. Personal Skin Insights */}
        <section
          id="insights"
          aria-labelledby="insights-heading"
          className="border-b border-stone-border bg-surface py-16 sm:py-20 lg:py-24"
        >
          <div className="editorial-container">
            <div className="mb-8 border-b border-stone-border pb-6">
              <p className="eyebrow-label text-sage-botanical">Personal Skin Insights</p>
              <h2
                id="insights-heading"
                className="mt-2 font-serif text-display-md font-normal text-ink"
              >
                Optical observations &amp; zone interpretation
              </h2>
            </div>

            {analysisResult ? (
              <SkinResultsPanel
                result={analysisResult}
                analysedPortraitUrl={analysedPortraitUrl}
                hasUnanalysedLocalPreview={Boolean(selectedImage)}
                selectedThemes={selectedThemes}
                onToggleTheme={handleToggleTheme}
                onSelectRoutineCategory={setSelectedCategory}
                onStartOver={handleResetAnalysis}
              />
            ) : (
              <EmptyState
                eyebrow="No Active Analysis Result"
                title="Complete a skin analysis to view your personal insights"
                description="Dew & Form never pre-populates production views with invented skin scores. Upload a front-facing portrait above and run 'Analyse my skin' when connected to YouCam—or load a clearly labeled documented YouCam sample fixture to explore how scores, facial sub-zones, and unreturned metrics are presented."
              >
                <a
                  href="#analysis"
                  className="inline-flex min-h-[44px] items-center rounded-editorial bg-forest px-5 py-2.5 text-xs font-medium text-surface transition-colors hover:bg-forest-hover"
                >
                  Go to skin analysis workspace
                </a>
                <button
                  type="button"
                  onClick={() => handleLoadFixture("hd-comprehensive")}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial border border-stone-strong bg-canvas px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/60"
                >
                  <FlaskConical className="h-3.5 w-3.5 text-clay" aria-hidden="true" />
                  <span>Preview documented HD sample fixture</span>
                </button>
              </EmptyState>
            )}
          </div>
        </section>

        {/* E & F. Skincare Product Discovery & Ingredient Transparency */}
        <ProductDiscoverySection
          connectedProducts={connectedProducts}
          registryConnected={registryConnected}
          registryLoading={registryLoading}
          activeRegistryQuery={activeRegistryQuery}
          onSearchRegistry={handleSearchRegistry}
          userShelfProducts={userShelfProducts}
          referenceFixtures={REFERENCE_FORMULATION_FIXTURES}
          showReferenceFixtures={showReferenceFixtures}
          onToggleReferenceFixtures={setShowReferenceFixtures}
          selectedThemes={selectedThemes}
          onToggleTheme={handleToggleTheme}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          comparedIds={comparedIds}
          onToggleCompare={handleToggleCompare}
          onInspectProduct={handleInspectProduct}
          onOpenShelfModal={() => setShelfModalOpen(true)}
        />

        {/* G. Side-by-Side Product Comparison */}
        <ProductComparison
          comparedProducts={comparedProducts}
          selectedThemes={selectedThemes}
          onRemoveFromCompare={handleToggleCompare}
          onClearComparison={() => setComparedIds([])}
          onInspectProduct={(prod) => handleInspectProduct(prod)}
        />
      </main>

      {/* Subtle Floating Compare Tray Pill when 1+ Formulations Selected */}
      {comparedProducts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-editorial border border-stone-strong bg-surface px-4 py-2.5 shadow-sm">
            <Scale className="h-4 w-4 text-forest" aria-hidden="true" />
            <span className="text-xs font-medium text-ink">
              {comparedProducts.length} of 3 formulations selected
            </span>
            <a
              href="#comparison"
              className="rounded-editorial bg-forest px-3.5 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-forest-hover"
            >
              {comparedProducts.length >= 2 ? "View comparison" : "Comparison tray"}
            </a>
          </div>
        </div>
      )}

      {/* Editorial Footer & Disclaimers */}
      <footer className="bg-canvas py-12 sm:py-16">
        <div className="editorial-container">
          <div className="grid grid-cols-1 gap-8 border-b border-stone-border pb-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-serif text-2xl text-ink">Dew &amp; Form</p>
              <p className="mt-1.5 font-serif text-sm italic text-ink-secondary">
                Find your skin&apos;s kind of care.
              </p>
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-secondary">
                A considered approach to skincare discovery—combining optical AI skin observations,
                transparent INCI monographs, and restrained side-by-side formulation assessment.
              </p>
            </div>

            <div className="md:col-span-3">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Navigation
              </h2>
              <ul className="mt-3 space-y-2 text-xs text-ink-secondary">
                <li>
                  <a href="#approach" className="hover:text-ink">
                    The Approach
                  </a>
                </li>
                <li>
                  <a href="#analysis" className="hover:text-ink">
                    Skin Analysis Workspace
                  </a>
                </li>
                <li>
                  <a href="#insights" className="hover:text-ink">
                    Personal Skin Insights
                  </a>
                </li>
                <li>
                  <a href="#discovery" className="hover:text-ink">
                    Formulations &amp; INCI Library
                  </a>
                </li>
                <li>
                  <a href="#comparison" className="hover:text-ink">
                    Formulation Comparison
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleTakeTour}
                    className="text-left text-forest underline decoration-forest/35 underline-offset-4 hover:text-forest-hover"
                  >
                    Replay guided tour
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Methodology &amp; Non-Medical Notice
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
                Skin analysis metrics are optical estimates generated via Perfect Corp&apos;s YouCam
                AI Skin Analysis v2.1 API and do not constitute medical, clinical, or dermatological
                advice. Ingredient roles reference European Commission CosIng nomenclature and
                published Cosmetic Ingredient Review (CIR) literature. Always patch test new topical
                products and consult a dermatologist for persistent skin conditions.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-ink-muted">
            <p>&copy; {new Date().getFullYear()} Dew &amp; Form. Built for YouCam AI Skin Analysis v2.1.</p>
            <p className="font-mono">
              Server-proxied S2S v2.1 architecture &middot; Zero client-exposed secrets
            </p>
          </div>
        </div>
      </footer>

      {/* Accessible Ingredient Details Drawer */}
      <IngredientDetails
        open={ingredientModalOpen}
        onOpenChange={setIngredientModalOpen}
        product={inspectedProduct}
        initialIngredientName={inspectedIngredientName}
        selectedThemes={selectedThemes}
      />

      {/* Accessible Shelf INCI Entry Modal */}
      <FormulaShelfModal
        open={shelfModalOpen}
        onOpenChange={setShelfModalOpen}
        onAddProduct={handleAddShelfProduct}
      />
    </div>
  );
}

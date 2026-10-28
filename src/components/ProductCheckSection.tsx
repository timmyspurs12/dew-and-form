"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  AlertTriangle,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  FileQuestion,
  Globe,
  HelpCircle,
  Loader2,
  Moon,
  Scale,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Sun,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FormulationCategory,
  ProductDataProvenance,
  SkincareProduct,
} from "@/lib/ingredients/types";
import {
  ALL_CARE_FOCUS_THEMES,
  CARE_THEME_METADATA,
  CONCERN_METADATA,
  type CareFocusTheme,
} from "@/lib/youcam/metadata";
import type { NormalizedSkinAnalysisResult } from "@/lib/youcam/types";
import { evaluateProductCheck } from "@/lib/product-check/evaluator";
import {
  PRODUCT_CLAIM_LABELS,
  SENSITIVITY_FLAG_LABELS,
  type ProductCheckCandidate,
  type ProductCheckEvaluationResult,
  type ProductCheckPersonalProfile,
  type ProductClaimKey,
  type SensitivityFlag,
  type UserSkinTypePreference,
} from "@/lib/product-check/types";
import type { RoutineTimeSlot } from "@/lib/routine/compatibility";

export interface ProductCheckSectionProps {
  catalogueProducts: SkincareProduct[];
  morningRoutineProducts: SkincareProduct[];
  eveningRoutineProducts: SkincareProduct[];
  personalProfile: ProductCheckPersonalProfile;
  onUpdatePersonalProfile: (
    updater:
      | Partial<ProductCheckPersonalProfile>
      | ((prev: ProductCheckPersonalProfile) => ProductCheckPersonalProfile)
  ) => void;
  genuineAnalysisResult: NormalizedSkinAnalysisResult | null;
  externalSeedProduct?: SkincareProduct | null;
  onCompareEvaluatedProduct: (product: SkincareProduct) => void;
  onAddToRoutine: (product: SkincareProduct, slot: RoutineTimeSlot) => void;
  onInspectMonographs: (product: SkincareProduct, initialIngredient?: string) => void;
  onVerdictGenerated?: (verdictTitle: string, productName: string) => void;
}

const CATEGORIES: FormulationCategory[] = [
  "Cleanser",
  "Toner & Essence",
  "Hydrating Serum",
  "Targeted Treatment",
  "Moisturiser & Barrier Cream",
  "Sunscreen",
];

const SKIN_TYPE_OPTIONS: UserSkinTypePreference[] = [
  "Unknown",
  "Normal",
  "Dry",
  "Oily",
  "Combination",
  "Sensitive-leaning",
];

const ALL_CLAIM_KEYS: ProductClaimKey[] = [
  "fragrance-free",
  "gentle-sensitive",
  "hydrating-barrier",
  "oil-blemish-control",
  "brightening-tone",
  "smoothing-anti-ageing",
  "broad-spectrum-spf",
  "non-comedogenic-hypoallergenic",
  "clinically-proven",
];

const ALL_SENSITIVITY_FLAGS: SensitivityFlag[] = [
  "fragrance",
  "essential-oils",
  "drying-alcohol",
  "exfoliating-acids",
  "retinoids",
  "benzoyl-peroxide",
  "sulfates",
  "lanolin-cholesterol",
  "silicones",
];

function mapProductToProvenance(product: SkincareProduct): ProductDataProvenance {
  if (product.sourceKind === "open-beauty-facts") return "open-beauty-facts-crowd";
  if (product.sourceKind === "reference-archetype") return "reference-archetype";
  if (product.inciDeclaration && product.inciDeclaration.trim().length >= 20) {
    return "confirmed-packaging-label";
  }
  return "manual-incomplete";
}

export function ProductCheckSection({
  catalogueProducts,
  morningRoutineProducts,
  eveningRoutineProducts,
  personalProfile,
  onUpdatePersonalProfile,
  genuineAnalysisResult,
  externalSeedProduct,
  onCompareEvaluatedProduct,
  onAddToRoutine,
  onInspectMonographs,
  onVerdictGenerated,
}: ProductCheckSectionProps) {
  const [inputTab, setInputTab] = useState<"catalogue" | "manual" | "url" | "photo">("catalogue");

  // Catalogue search state
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [catSearching, setCatSearching] = useState(false);
  const [catSearchResults, setCatSearchResults] = useState<SkincareProduct[]>([]);
  const [catSearchNote, setCatSearchNote] = useState<string | null>(null);

  // URL extractor state
  const [urlInput, setUrlInput] = useState("");
  const [urlExtracting, setUrlExtracting] = useState(false);
  const [urlStatusMessage, setUrlStatusMessage] = useState<{
    tone: "info" | "warn";
    text: string;
  } | null>(null);

  // Label photo upload state
  const [inciPhotoPreview, setInciPhotoPreview] = useState<string | null>(null);
  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(null);
  const [photoZoomed, setPhotoZoomed] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoBoundaryNote, setPhotoBoundaryNote] = useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);

  // Confirm Product Identity form state (initialized from externalSeedProduct when seeded)
  const [candidateId, setCandidateId] = useState(
    () => externalSeedProduct?.id ?? "check-custom-draft"
  );
  const [productName, setProductName] = useState(() => externalSeedProduct?.name ?? "");
  const [brand, setBrand] = useState(() => externalSeedProduct?.brand ?? "");
  const [category, setCategory] = useState<FormulationCategory>(
    () => externalSeedProduct?.category ?? "Hydrating Serum"
  );
  const [inciDeclaration, setInciDeclaration] = useState(
    () => externalSeedProduct?.inciDeclaration ?? ""
  );
  const [provenance, setProvenance] = useState<ProductDataProvenance>(() =>
    externalSeedProduct ? mapProductToProvenance(externalSeedProduct) : "manual-incomplete"
  );
  const [userConfirmedLabel, setUserConfirmedLabel] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(
    () => externalSeedProduct?.sourceUrl ?? null
  );
  const [barcode, setBarcode] = useState<string | null>(
    () => externalSeedProduct?.barcode ?? null
  );
  const [priceAmount, setPriceAmount] = useState(() =>
    externalSeedProduct?.price ? String(externalSeedProduct.price.amount) : ""
  );
  const [priceCurrency, setPriceCurrency] = useState(
    () => externalSeedProduct?.price?.currency || "USD"
  );
  const [sizeLabel, setSizeLabel] = useState(() => externalSeedProduct?.sizeLabel || "");
  const [statedClaims, setStatedClaims] = useState<ProductClaimKey[]>(() =>
    externalSeedProduct?.attributes.includes("Fragrance-free") ? ["fragrance-free"] : []
  );

  // Optional Personalisation drawer open state
  const [personalisationOpen, setPersonalisationOpen] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Verdict output state
  const [evaluation, setEvaluation] = useState<ProductCheckEvaluationResult | null>(null);

  const inciTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const verdictRef = useRef<HTMLDivElement | null>(null);

  // Revoke object URLs on unmount / replacement
  useEffect(() => {
    return () => {
      if (inciPhotoPreview) URL.revokeObjectURL(inciPhotoPreview);
      if (frontPhotoPreview) URL.revokeObjectURL(frontPhotoPreview);
    };
  }, [inciPhotoPreview, frontPhotoPreview]);

  const loadProductIntoIdentity = (product: SkincareProduct) => {
    setCandidateId(product.id);
    setProductName(product.name);
    setBrand(product.brand);
    setCategory(product.category);
    setInciDeclaration(product.inciDeclaration || "");
    setProvenance(mapProductToProvenance(product));
    setUserConfirmedLabel(false);
    setSourceUrl(product.sourceUrl ?? null);
    setBarcode(product.barcode ?? null);
    setPriceAmount(product.price ? String(product.price.amount) : "");
    setPriceCurrency(product.price?.currency || "USD");
    setSizeLabel(product.sizeLabel || "");
    setStatedClaims(product.attributes.includes("Fragrance-free") ? ["fragrance-free"] : []);
    setIdentityError(null);
    setEvaluation(null);
  };

  const applySamplePreset = (kind: "barrier-fit" | "fragrance-acid-concern" | "name-only") => {
    setSourceUrl(null);
    setBarcode(null);
    setIdentityError(null);
    setEvaluation(null);

    if (kind === "barrier-fit") {
      setCandidateId("check-sample-barrier");
      setProductName("Soothing Panthenol & Ceramide Fluid");
      setBrand("Sample Packaging Label");
      setCategory("Hydrating Serum");
      setInciDeclaration(
        "Aqua, Glycerin, Panthenol, Niacinamide, Sodium Hyaluronate, Ceramide NP, Squalane, Allantoin, Phenoxyethanol"
      );
      setProvenance("confirmed-packaging-label");
      setUserConfirmedLabel(true);
      setPriceAmount("18");
      setSizeLabel("50 ml");
      setStatedClaims(["fragrance-free", "hydrating-barrier", "gentle-sensitive"]);
    } else if (kind === "fragrance-acid-concern") {
      setCandidateId("check-sample-concern");
      setProductName("Botanical Citrus Glow Peel Toner");
      setBrand("Sample Packaging Label");
      setCategory("Targeted Treatment");
      setInciDeclaration(
        "Aqua, Alcohol Denat., Glycolic Acid, Glycerin, Salicylic Acid, Lavandula Angustifolia Oil, Parfum, Limonene, Linalool, Phenoxyethanol"
      );
      setProvenance("confirmed-packaging-label");
      setUserConfirmedLabel(true);
      setPriceAmount("34");
      setSizeLabel("120 ml");
      setStatedClaims(["fragrance-free", "gentle-sensitive", "non-comedogenic-hypoallergenic"]);
    } else {
      setCandidateId("check-sample-incomplete");
      setProductName("Miracle Glass-Skin Peptide Drops");
      setBrand("Unverified Listing");
      setCategory("Hydrating Serum");
      setInciDeclaration("");
      setProvenance("manual-incomplete");
      setUserConfirmedLabel(false);
      setPriceAmount("");
      setSizeLabel("");
      setStatedClaims(["clinically-proven", "hydrating-barrier"]);
    }
  };

  const handleCatalogueSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = catSearchQuery.trim();
    if (!q) {
      setCatSearchResults([]);
      setCatSearchNote(null);
      return;
    }

    setCatSearching(true);
    setCatSearchNote(null);

    const localMatches = catalogueProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.brand.toLowerCase().includes(q.toLowerCase()) ||
        (p.barcode && p.barcode.includes(q))
    );

    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          connected?: boolean;
          products?: SkincareProduct[];
        };
        const remote = Array.isArray(data.products) ? data.products : [];
        const mergedMap = new Map<string, SkincareProduct>();
        for (const item of [...localMatches, ...remote]) {
          mergedMap.set(item.id, item);
        }
        const merged = Array.from(mergedMap.values());
        setCatSearchResults(merged);
        if (merged.length === 0) {
          setCatSearchNote(
            data.connected === false
              ? "Live Open Beauty Facts lookup is unreachable right now—no local catalogue match found. Enter the product name and paste its INCI list in Step 2 below."
              : `No verified INCI record matched "${q}". Enter the product details manually in Step 2 below.`
          );
        }
      } else {
        setCatSearchResults(localMatches);
        if (localMatches.length === 0) {
          setCatSearchNote(
            "Catalogue lookup unavailable—enter or paste the product's INCI list manually below."
          );
        }
      }
    } catch {
      setCatSearchResults(localMatches);
      if (localMatches.length === 0) {
        setCatSearchNote(
          "Network offline—enter or paste the product's INCI list manually below."
        );
      }
    } finally {
      setCatSearching(false);
    }
  };

  const handleExtractUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlExtracting(true);
    setUrlStatusMessage(null);
    setEvaluation(null);

    try {
      const res = await fetch("/api/product-check/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        extractionStatus?: string;
        provenance?: ProductDataProvenance;
        message?: string;
        product?: {
          name: string;
          brand: string;
          category: FormulationCategory;
          inciDeclaration: string;
          sourceUrl: string;
          barcode: string | null;
        } | null;
      };

      if (data.ok && data.product) {
        setCandidateId(`url-${Date.now()}`);
        setProductName(data.product.name);
        setBrand(data.product.brand);
        setCategory(data.product.category);
        setInciDeclaration(data.product.inciDeclaration);
        setProvenance(data.provenance || "unverified-url");
        setUserConfirmedLabel(false);
        setSourceUrl(data.product.sourceUrl);
        setBarcode(data.product.barcode);
        setUrlStatusMessage({
          tone: data.extractionStatus === "complete_inci" ? "info" : "warn",
          text:
            data.message ||
            "Review extracted details carefully against the physical packaging below.",
        });
      } else {
        setUrlStatusMessage({
          tone: "warn",
          text:
            data.message ||
            "Could not extract verified INCI text from that URL. Paste the INCI list manually in Step 2 below.",
        });
      }
    } catch {
      setUrlStatusMessage({
        tone: "warn",
        text: "Network error while inspecting URL. Paste the product name and INCI list manually below.",
      });
    } finally {
      setUrlExtracting(false);
    }
  };

  const handlePhotoUploadChange = async (
    inciFile: File | null,
    frontFile: File | null
  ) => {
    if (!inciFile) return;

    if (inciPhotoPreview) URL.revokeObjectURL(inciPhotoPreview);
    if (frontPhotoPreview) URL.revokeObjectURL(frontPhotoPreview);

    const nextInciUrl = URL.createObjectURL(inciFile);
    const nextFrontUrl = frontFile ? URL.createObjectURL(frontFile) : null;
    setInciPhotoPreview(nextInciUrl);
    setFrontPhotoPreview(nextFrontUrl);
    setPhotoUploading(true);
    setPhotoBoundaryNote(null);

    try {
      const form = new FormData();
      form.append("inciImage", inciFile);
      if (frontFile) form.append("frontImage", frontFile);

      const res = await fetch("/api/product-check/ocr", {
        method: "POST",
        body: form,
      });

      const payload = (await res.json()) as {
        ok?: boolean;
        ocrConfigured?: boolean;
        message?: string;
        extracted?: {
          productName?: string;
          brand?: string;
          inciDeclaration?: string;
        } | null;
      };

      if (!res.ok || !payload.ok) {
        setPhotoBoundaryNote({
          tone: "error",
          text: payload.message || "Selected file is not a valid JPEG or PNG photograph.",
        });
        return;
      }

      if (payload.extracted) {
        if (payload.extracted.productName) setProductName(payload.extracted.productName);
        if (payload.extracted.brand) setBrand(payload.extracted.brand);
        if (payload.extracted.inciDeclaration) {
          setInciDeclaration(payload.extracted.inciDeclaration);
          setProvenance("confirmed-packaging-label");
        }
      }

      setPhotoBoundaryNote({
        tone: "info",
        text:
          payload.message ||
          "Label photo validated. Use the zoom loupe below to verify or transcribe the INCI list.",
      });
    } catch {
      setPhotoBoundaryNote({
        tone: "info",
        text: "Label photo loaded locally—use the zoom preview below to transcribe the INCI list directly.",
      });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSyncGenuineYouCamScan = () => {
    if (!genuineAnalysisResult) return;
    const lowestMetrics = [...genuineAnalysisResult.metrics]
      .filter((m) => (m.uiScore ?? m.rawScore) !== null)
      .sort((a, b) => (a.uiScore ?? a.rawScore ?? 100) - (b.uiScore ?? b.rawScore ?? 100))
      .slice(0, 2);

    const derivedGoals = Array.from(
      new Set<CareFocusTheme>(
        lowestMetrics.flatMap((m) => CONCERN_METADATA[m.key].relatedThemes.slice(0, 1))
      )
    );

    const wholeSkinType = genuineAnalysisResult.skinType.whole;
    const validSkinType: UserSkinTypePreference =
      wholeSkinType === "Dry" ||
      wholeSkinType === "Oily" ||
      wholeSkinType === "Combination" ||
      wholeSkinType === "Normal"
        ? wholeSkinType
        : personalProfile.skinType;

    onUpdatePersonalProfile((prev) => ({
      ...prev,
      goals: derivedGoals.length > 0 ? derivedGoals : prev.goals,
      skinType: validSkinType,
    }));
  };

  const toggleClaim = (claim: ProductClaimKey) => {
    setStatedClaims((prev) =>
      prev.includes(claim) ? prev.filter((c) => c !== claim) : [...prev, claim]
    );
  };

  const toggleGoal = (goal: CareFocusTheme) => {
    onUpdatePersonalProfile((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const toggleSensitivity = (flag: SensitivityFlag) => {
    onUpdatePersonalProfile((prev) => ({
      ...prev,
      sensitivities: prev.sensitivities.includes(flag)
        ? prev.sensitivities.filter((s) => s !== flag)
        : [...prev.sensitivities, flag],
    }));
  };

  const handleRunEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() && !inciDeclaration.trim()) {
      setIdentityError(
        "Enter at least a product name or paste an INCI ingredient list to run Product Check."
      );
      return;
    }

    setIdentityError(null);
    const parsedPrice = Number.parseFloat(priceAmount);
    const validPrice =
      priceAmount.trim() !== "" && Number.isFinite(parsedPrice) && parsedPrice >= 0
        ? { amount: parsedPrice, currency: priceCurrency }
        : null;

    const candidate: ProductCheckCandidate = {
      id: candidateId,
      name: productName.trim() || "Unlabeled Formulation",
      brand: brand.trim() || "Unspecified Brand",
      category,
      inciDeclaration,
      provenance: userConfirmedLabel ? "confirmed-packaging-label" : provenance,
      userConfirmedLabel,
      sourceUrl,
      barcode,
      price: validPrice,
      sizeLabel: sizeLabel.trim() || null,
      statedClaims,
    };

    const result = evaluateProductCheck(candidate, personalProfile, {
      morningProducts: morningRoutineProducts,
      eveningProducts: eveningRoutineProducts,
    });
    setEvaluation(result);
    onVerdictGenerated?.(result.verdictTitle, candidate.name);

    window.requestAnimationFrame(() => {
      verdictRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const displayedCataloguePickList = useMemo(() => {
    return catSearchResults.length > 0 ? catSearchResults : catalogueProducts.slice(0, 6);
  }, [catSearchResults, catalogueProducts]);

  const provenanceBadgeUi = useMemo(() => {
    if (userConfirmedLabel || provenance === "confirmed-packaging-label") {
      return {
        label: "Confirmed packaging label",
        toneClass: "border-sage-muted bg-sage-soft text-forest",
      };
    }
    if (provenance === "open-beauty-facts-crowd") {
      return {
        label: "Third-party crowd record (Open Beauty Facts ODbL)",
        toneClass: "border-stone-strong bg-canvas text-ink-secondary",
      };
    }
    if (provenance === "reference-archetype") {
      return {
        label: "Reference archetype formula",
        toneClass: "border-clay/60 bg-clay-soft text-clay-deep",
      };
    }
    if (provenance === "unverified-url") {
      return {
        label: "Unverified web URL — check physical box",
        toneClass: "border-clay bg-clay-soft text-clay-deep",
      };
    }
    return {
      label: "Manual draft — verify INCI from packaging",
      toneClass: "border-stone-border bg-canvas text-ink-secondary",
    };
  }, [provenance, userConfirmedLabel]);

  return (
    <section
      id="product-check"
      aria-labelledby="product-check-heading"
      className="border-b border-stone-border bg-surface py-16 sm:py-20 lg:py-24"
    >
      <div className="editorial-container">
        {/* Section Editorial Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-stone-border pb-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="eyebrow-label text-sage-botanical">
              Signature Workspace &middot; Evidence-Based Formulation Evaluation
            </p>
            <h2
              id="product-check-heading"
              tabIndex={-1}
              className="mt-2.5 font-serif text-display-md font-normal text-ink focus:outline-none"
            >
              Dew &amp; Form Product Check
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-base">
              Evaluate whether a skincare product is a potential fit for your goals, sensitivities,
              and current routine using its actual INCI declaration and European Commission CosIng /
              CIR ingredient context—without invented compatibility scores or clinical claims.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Try a sample scenario:
            </span>
            <button
              type="button"
              onClick={() => applySamplePreset("barrier-fit")}
              className="chip-interactive border-stone-strong bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:border-forest hover:bg-sage-soft/50"
            >
              Barrier serum
            </button>
            <button
              type="button"
              onClick={() => applySamplePreset("fragrance-acid-concern")}
              className="chip-interactive border-stone-strong bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:border-forest hover:bg-sage-soft/50"
            >
              Fragranced AHA toner
            </button>
            <button
              type="button"
              onClick={() => applySamplePreset("name-only")}
              className="chip-interactive border-stone-border bg-canvas px-3 py-1.5 text-xs text-ink-secondary hover:border-stone-strong hover:text-ink"
            >
              Missing-INCI product
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* LEFT COLUMN (6 cols): Step 1 Input + Step 2 Identity Confirmation + Step 3 Optional Personalisation */}
          <div className="space-y-8 lg:col-span-6">
            {/* STEP 1: PRODUCT INPUT METHODS */}
            <div className="rounded-editorial border border-stone-border bg-canvas p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-forest">
                  01 &middot; Select Input Source
                </span>
                <span className="text-xs text-ink-muted">
                  Catalogue, Manual INCI, URL, or Label Photo
                </span>
              </div>

              <Tabs.Root
                value={inputTab}
                onValueChange={(v) =>
                  setInputTab(v as "catalogue" | "manual" | "url" | "photo")
                }
                className="mt-4"
              >
                <Tabs.List
                  aria-label="Product input method"
                  className="grid grid-cols-2 gap-1.5 rounded-editorial border border-stone-border bg-surface p-1 sm:grid-cols-4"
                >
                  <Tabs.Trigger
                    value="catalogue"
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-editorial px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors data-[state=active]:bg-forest data-[state=active]:text-surface"
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Catalogue</span>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="manual"
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-editorial px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors data-[state=active]:bg-forest data-[state=active]:text-surface"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Paste INCI</span>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="url"
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-editorial px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors data-[state=active]:bg-forest data-[state=active]:text-surface"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Product URL</span>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="photo"
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-editorial px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors data-[state=active]:bg-forest data-[state=active]:text-surface"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Label Photo</span>
                  </Tabs.Trigger>
                </Tabs.List>

                {/* Tab 1: Search Verified Catalogue / Barcode */}
                <Tabs.Content value="catalogue" className="mt-4 space-y-4 focus:outline-none">
                  <form onSubmit={handleCatalogueSearch} className="flex gap-2">
                    <input
                      type="search"
                      value={catSearchQuery}
                      onChange={(e) => setCatSearchQuery(e.target.value)}
                      placeholder="Search product name, brand, or EAN/UPC barcode…"
                      aria-label="Search product catalogue for Product Check"
                      className="min-h-[42px] flex-1 rounded-editorial border border-stone-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-muted"
                    />
                    <button
                      type="submit"
                      disabled={catSearching}
                      className="btn-editorial-primary min-h-[42px] px-4 text-xs"
                    >
                      {catSearching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Lookup</span>
                    </button>
                  </form>

                  {catSearchNote && (
                    <p className="rounded-editorial border border-stone-border bg-surface p-3 text-xs text-ink-secondary">
                      {catSearchNote}
                    </p>
                  )}

                  {displayedCataloguePickList.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        Select a product to load into Identity Confirmation below:
                      </p>
                      <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                        {displayedCataloguePickList.map((item) => {
                          const isLoaded = candidateId === item.id && productName === item.name;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => loadProductIntoIdentity(item)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-editorial border px-3.5 py-2.5 text-left text-xs transition-colors",
                                isLoaded
                                  ? "border-forest bg-sage-soft/75 text-ink"
                                  : "border-stone-border bg-surface text-ink hover:border-stone-strong"
                              )}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">{item.name}</p>
                                <p className="truncate text-[11px] text-ink-secondary">
                                  {item.brand} &middot; {item.category}
                                </p>
                              </div>
                              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-forest">
                                {isLoaded ? "Loaded" : "Select"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Tabs.Content>

                {/* Tab 2: Manual Entry Guidance */}
                <Tabs.Content value="manual" className="mt-4 focus:outline-none">
                  <p className="rounded-editorial border border-stone-border bg-surface p-3.5 text-xs leading-relaxed text-ink-secondary">
                    Type the product name and paste the comma-separated{" "}
                    <strong className="font-medium text-ink">Ingredients (INCI)</strong> list from
                    the box or manufacturer disclosure directly into{" "}
                    <strong className="font-medium text-ink">02 · Confirm Product Identity</strong>{" "}
                    below. Check the packaging verification box if you copied it straight from your
                    container.
                  </p>
                </Tabs.Content>

                {/* Tab 3: Safe HTTPS URL Extractor */}
                <Tabs.Content value="url" className="mt-4 space-y-3 focus:outline-none">
                  <form onSubmit={handleExtractUrl} className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://world.openbeautyfacts.org/product/... or HTTPS product URL"
                      aria-label="Product page HTTPS URL"
                      className="min-h-[42px] flex-1 rounded-editorial border border-stone-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-muted"
                    />
                    <button
                      type="submit"
                      disabled={urlExtracting || !urlInput.trim()}
                      className="btn-editorial-primary min-h-[42px] px-4 text-xs"
                    >
                      {urlExtracting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Fetch page</span>
                    </button>
                  </form>
                  <p className="text-[11px] leading-relaxed text-ink-muted">
                    Protected against private/internal network redirects. Web pages that only expose
                    marketing copy without a full INCI list are never marked verified.
                  </p>
                  {urlStatusMessage && (
                    <div
                      role="status"
                      className={cn(
                        "rounded-editorial border p-3 text-xs leading-relaxed",
                        urlStatusMessage.tone === "warn"
                          ? "border-clay/65 bg-clay-soft/65 text-clay-deep"
                          : "border-sage-muted bg-sage-soft/65 text-ink"
                      )}
                    >
                      {urlStatusMessage.text}
                    </div>
                  )}
                </Tabs.Content>

                {/* Tab 4: Label Photograph Upload + Interactive Loupe */}
                <Tabs.Content value="photo" className="mt-4 space-y-3.5 focus:outline-none">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer flex-col justify-between rounded-editorial border border-dashed border-stone-strong bg-surface p-3.5 text-xs transition-colors hover:border-forest hover:bg-sage-soft/35">
                      <span className="font-medium text-ink">
                        Ingredient List Photo (JPEG/PNG) *
                      </span>
                      <span className="mt-1 text-[11px] text-ink-secondary">
                        Clear close-up of the carton INCI panel (max 10 MB, never stored permanently)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        aria-label="Upload ingredient list photograph"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          void handlePhotoUploadChange(file, null);
                        }}
                        className="mt-2.5 text-[11px] text-ink-secondary file:mr-2.5 file:rounded-editorial file:border-0 file:bg-forest file:px-2.5 file:py-1 file:text-[11px] file:font-medium file:text-surface"
                      />
                    </label>

                    <label className="flex cursor-pointer flex-col justify-between rounded-editorial border border-dashed border-stone-border bg-surface p-3.5 text-xs transition-colors hover:border-stone-strong">
                      <span className="font-medium text-ink">Front Label Photo (optional)</span>
                      <span className="mt-1 text-[11px] text-ink-secondary">
                        Helpful for confirming exact product name, variant, and stated claims
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        aria-label="Upload front label photograph"
                        onChange={(e) => {
                          const front = e.target.files?.[0] ?? null;
                          if (front) {
                            if (frontPhotoPreview) URL.revokeObjectURL(frontPhotoPreview);
                            setFrontPhotoPreview(URL.createObjectURL(front));
                          }
                        }}
                        className="mt-2.5 text-[11px] text-ink-secondary file:mr-2.5 file:rounded-editorial file:border file:border-stone-strong file:bg-canvas file:px-2.5 file:py-1 file:text-[11px] file:font-medium file:text-ink"
                      />
                    </label>
                  </div>

                  {photoUploading && (
                    <p className="inline-flex items-center gap-2 text-xs text-ink-secondary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-forest" />
                      <span>Validating label photograph format…</span>
                    </p>
                  )}

                  {photoBoundaryNote && (
                    <div
                      role="status"
                      className={cn(
                        "rounded-editorial border p-3 text-xs leading-relaxed",
                        photoBoundaryNote.tone === "error"
                          ? "border-clay bg-clay-soft text-clay-deep"
                          : "border-sage-muted bg-sage-soft/55 text-ink-secondary"
                      )}
                    >
                      {photoBoundaryNote.text}
                    </div>
                  )}

                  {inciPhotoPreview && (
                    <div className="rounded-editorial border border-stone-border bg-surface p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-forest">
                          Label Transcription Reference Loupe
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhotoZoomed((z) => !z)}
                          className="inline-flex items-center gap-1 rounded-editorial border border-stone-strong bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-sage-soft/50"
                        >
                          <ZoomIn className="h-3 w-3" aria-hidden="true" />
                          <span>{photoZoomed ? "1x Fit" : "1.75x Magnify"}</span>
                        </button>
                      </div>
                      <div className="max-h-56 overflow-auto rounded-editorial border border-stone-border bg-canvas">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={inciPhotoPreview}
                          alt="Uploaded ingredient label preview for manual verification"
                          className={cn(
                            "origin-top-left transition-transform duration-200",
                            photoZoomed ? "w-[175%] max-w-none" : "w-full object-contain"
                          )}
                        />
                      </div>
                    </div>
                  )}
                </Tabs.Content>
              </Tabs.Root>
            </div>

            {/* STEP 2 & 3: CONFIRM PRODUCT IDENTITY + OPTIONAL PERSONALISATION */}
            <form
              onSubmit={handleRunEvaluation}
              className="space-y-6 rounded-editorial border border-stone-border bg-canvas p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-border pb-4">
                <div>
                  <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-forest">
                    02 &middot; Confirm Product Identity &amp; INCI
                  </span>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Review and correct any details before assessment. Formulations can differ across
                    countries and reformulation batches.
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-editorial border px-2.5 py-1 font-mono text-[10px] font-medium",
                    provenanceBadgeUi.toneClass
                  )}
                >
                  {provenanceBadgeUi.label}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="pc-product-name"
                    className="block text-xs font-medium text-ink"
                  >
                    Candidate Title
                  </label>
                  <input
                    id="pc-product-name"
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Hyaluronic Acid 2% + B5"
                    className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-muted"
                  />
                </div>

                <div>
                  <label htmlFor="pc-brand" className="block text-xs font-medium text-ink">
                    Brand
                  </label>
                  <input
                    id="pc-brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. The Ordinary"
                    className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="pc-category" className="block text-xs font-medium text-ink">
                    Routine Step / Category
                  </label>
                  <select
                    id="pc-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FormulationCategory)}
                    className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-surface px-3 text-sm text-ink"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pc-price" className="block text-xs font-medium text-ink">
                    Listed Price
                  </label>
                  <div className="mt-1.5 flex gap-1.5">
                    <select
                      aria-label="Product price currency"
                      value={priceCurrency}
                      onChange={(e) => setPriceCurrency(e.target.value)}
                      className="min-h-[42px] rounded-editorial border border-stone-strong bg-surface px-2 text-xs text-ink"
                    >
                      <option value="USD">USD</option>
                      <option value="NGN">NGN</option>
                      <option value="GBP">GBP</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <input
                      id="pc-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      placeholder="Amount"
                      className="min-h-[42px] w-full rounded-editorial border border-stone-strong bg-surface px-2.5 text-sm text-ink placeholder:text-ink-muted"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pc-size" className="block text-xs font-medium text-ink">
                    Size / Volume (optional)
                  </label>
                  <input
                    id="pc-size"
                    type="text"
                    value={sizeLabel}
                    onChange={(e) => setSizeLabel(e.target.value)}
                    placeholder="e.g. 30 ml"
                    className="mt-1.5 min-h-[42px] w-full rounded-editorial border border-stone-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-muted"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="pc-inci" className="block text-xs font-medium text-ink">
                    Packaging INCI List
                  </label>
                  <span className="font-mono text-[10px] text-ink-muted">
                    Comma- or hyphen-separated packaging list
                  </span>
                </div>
                <textarea
                  id="pc-inci"
                  ref={inciTextareaRef}
                  rows={4}
                  value={inciDeclaration}
                  onChange={(e) => {
                    setInciDeclaration(e.target.value);
                    if (provenance === "open-beauty-facts-crowd" || provenance === "unverified-url") {
                      setProvenance("confirmed-packaging-label");
                    }
                  }}
                  placeholder="Aqua, Glycerin, Niacinamide, Panthenol, Ceramide NP, Squalane, Phenoxyethanol…"
                  className="mt-1.5 w-full rounded-editorial border border-stone-strong bg-surface p-3 text-xs leading-relaxed text-ink placeholder:text-ink-muted"
                />

                <label className="mt-2.5 inline-flex cursor-pointer items-start gap-2.5 text-xs text-ink-secondary">
                  <input
                    type="checkbox"
                    checked={userConfirmedLabel}
                    onChange={(e) => setUserConfirmedLabel(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-editorial border-stone-strong accent-[#26382F]"
                  />
                  <span>
                    I verified this ingredient list directly against the physical product packaging
                    or current regional manufacturer label.
                  </span>
                </label>
              </div>

              {/* Stated Marketing Claims to Substantiate */}
              <div>
                <span className="block text-xs font-medium text-ink">
                  Claims on the packaging to check (optional)
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ALL_CLAIM_KEYS.map((claim) => {
                    const active = statedClaims.includes(claim);
                    return (
                      <button
                        key={claim}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleClaim(claim)}
                        className={cn(
                          "chip-interactive px-2.5 py-1 text-[11px]",
                          active
                            ? "border-forest bg-forest font-medium text-surface"
                            : "border-stone-border bg-surface text-ink-secondary hover:border-stone-strong hover:text-ink"
                        )}
                      >
                        {active && <Check className="h-3 w-3" aria-hidden="true" />}
                        <span>{PRODUCT_CLAIM_LABELS[claim]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: CONCISE OPTIONAL PERSONALISATION */}
              <Collapsible.Root
                open={personalisationOpen}
                onOpenChange={setPersonalisationOpen}
                className="rounded-editorial border border-stone-border bg-surface"
              >
                <Collapsible.Trigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-xs font-medium text-ink transition-colors hover:bg-sage-soft/35"
                  >
                    <span className="inline-flex items-center gap-2">
                      <SlidersHorizontal
                        className="h-3.5 w-3.5 text-forest"
                        aria-hidden="true"
                      />
                      <span>
                        03 &middot; Personalise for Your Goals, Sensitivities &amp; Budget{" "}
                        <span className="font-normal text-ink-secondary">(optional)</span>
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] text-sage-botanical">
                      <span>
                        {personalProfile.goals.length} goal
                        {personalProfile.goals.length === 1 ? "" : "s"} &middot;{" "}
                        {personalProfile.sensitivities.length} exclusion
                        {personalProfile.sensitivities.length === 1 ? "" : "s"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          personalisationOpen && "rotate-180"
                        )}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </Collapsible.Trigger>

                <Collapsible.Content className="space-y-4 border-t border-stone-border p-4 text-xs">
                  {genuineAnalysisResult && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-editorial border border-sage-muted bg-sage-soft/55 p-3">
                      <p className="text-ink-secondary">
                        <strong className="font-medium text-ink">Active YouCam scan available:</strong>{" "}
                        Reuse optical focus areas ({genuineAnalysisResult.skinType.whole || "observed"} profile)?
                      </p>
                      <button
                        type="button"
                        onClick={handleSyncGenuineYouCamScan}
                        className="inline-flex items-center gap-1.5 rounded-editorial bg-forest px-3 py-1.5 text-[11px] font-medium text-surface hover:bg-forest-hover"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        <span>Apply scan insights</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-ink">Skincare goals</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ALL_CARE_FOCUS_THEMES.map((theme) => {
                        const selected = personalProfile.goals.includes(theme);
                        return (
                          <button
                            key={theme}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleGoal(theme)}
                            className={cn(
                              "chip-interactive px-2.5 py-1 text-xs",
                              selected
                                ? "border-forest bg-forest font-medium text-surface"
                                : "border-stone-border bg-canvas text-ink hover:border-stone-strong"
                            )}
                          >
                            {CARE_THEME_METADATA[theme].shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pc-skin-type" className="block font-medium text-ink">
                        Skin type (if known)
                      </label>
                      <select
                        id="pc-skin-type"
                        value={personalProfile.skinType}
                        onChange={(e) =>
                          onUpdatePersonalProfile({
                            skinType: e.target.value as UserSkinTypePreference,
                          })
                        }
                        className="mt-1 min-h-[38px] w-full rounded-editorial border border-stone-strong bg-canvas px-2.5 text-xs text-ink"
                      >
                        {SKIN_TYPE_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="pc-budget" className="block font-medium text-ink">
                        Target budget ceiling (optional)
                      </label>
                      <div className="mt-1 flex gap-1.5">
                        <select
                          aria-label="Budget currency"
                          value={personalProfile.budgetCurrency}
                          onChange={(e) =>
                            onUpdatePersonalProfile({ budgetCurrency: e.target.value })
                          }
                          className="min-h-[38px] rounded-editorial border border-stone-strong bg-canvas px-2 text-xs text-ink"
                        >
                          <option value="USD">USD</option>
                          <option value="NGN">NGN</option>
                          <option value="GBP">GBP</option>
                          <option value="EUR">EUR</option>
                        </select>
                        <input
                          id="pc-budget"
                          type="number"
                          min="0"
                          step="1"
                          value={personalProfile.budgetMaxAmount ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            const num = Number.parseFloat(val);
                            onUpdatePersonalProfile({
                              budgetMaxAmount:
                                val !== "" && Number.isFinite(num) && num > 0 ? num : null,
                            });
                          }}
                          placeholder="No limit"
                          className="min-h-[38px] w-full rounded-editorial border border-stone-strong bg-canvas px-2.5 text-xs text-ink"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-ink">
                      Sensitivities or ingredients you prefer to avoid
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ALL_SENSITIVITY_FLAGS.map((flag) => {
                        const active = personalProfile.sensitivities.includes(flag);
                        return (
                          <button
                            key={flag}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleSensitivity(flag)}
                            className={cn(
                              "chip-interactive px-2.5 py-1 text-[11px]",
                              active
                                ? "border-clay-deep bg-clay-soft font-medium text-clay-deep"
                                : "border-stone-border bg-canvas text-ink-secondary hover:text-ink"
                            )}
                          >
                            {SENSITIVITY_FLAG_LABELS[flag].split(" (")[0]}
                          </button>
                        );
                      })}
                    </div>

                    <label htmlFor="pc-custom-allergens" className="mt-3 block font-medium text-ink">
                      Specific known allergens (comma-separated INCI names)
                    </label>
                    <input
                      id="pc-custom-allergens"
                      type="text"
                      value={personalProfile.customAllergens}
                      onChange={(e) =>
                        onUpdatePersonalProfile({ customAllergens: e.target.value })
                      }
                      placeholder="e.g. Phenoxyethanol, Propylene Glycol, Benzyl Alcohol"
                      className="mt-1 min-h-[38px] w-full rounded-editorial border border-stone-strong bg-canvas px-3 text-xs text-ink placeholder:text-ink-muted"
                    />
                  </div>

                  <div className="border-t border-stone-border pt-3">
                    <span className="font-medium text-ink">
                      Current routine context{" "}
                      {(morningRoutineProducts.length > 0 ||
                        eveningRoutineProducts.length > 0) && (
                        <span className="font-normal text-sage-botanical">
                          (also checked automatically against your {morningRoutineProducts.length + eveningRoutineProducts.length} saved My Routine item
                          {morningRoutineProducts.length + eveningRoutineProducts.length === 1
                            ? ""
                            : "s"}
                          )
                        </span>
                      )}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={personalProfile.usesLeaveOnAcidInRoutine}
                          onChange={(e) =>
                            onUpdatePersonalProfile({
                              usesLeaveOnAcidInRoutine: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-[#26382F]"
                        />
                        <span>Already using a leave-on AHA/BHA</span>
                      </label>

                      <label className="inline-flex items-center gap-2 text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={personalProfile.usesRetinoidInRoutine}
                          onChange={(e) =>
                            onUpdatePersonalProfile({
                              usesRetinoidInRoutine: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-[#26382F]"
                        />
                        <span>Already using a retinoid</span>
                      </label>

                      <label className="inline-flex items-center gap-2 text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={personalProfile.usesDailySunscreen === "no"}
                          onChange={(e) =>
                            onUpdatePersonalProfile({
                              usesDailySunscreen: e.target.checked ? "no" : "unset",
                            })
                          }
                          className="h-4 w-4 accent-[#26382F]"
                        />
                        <span>Not using daily morning SPF yet</span>
                      </label>
                    </div>
                  </div>
                </Collapsible.Content>
              </Collapsible.Root>

              {identityError && (
                <p role="alert" className="text-xs font-medium text-clay-deep">
                  {identityError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-border pt-4">
                <p className="text-[11px] text-ink-muted">
                  Evaluates actual INCI tokens &middot; Never invents concentrations or diagnoses
                </p>
                <button
                  type="submit"
                  className="btn-editorial-primary min-h-[46px] px-6 py-2.5 text-xs tracking-wide"
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Evaluate Product Fit</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN (6 cols): THE VERDICT LEDGER */}
          <div ref={verdictRef} className="lg:col-span-6">
            {!evaluation ? (
              <div className="flex h-full flex-col justify-between rounded-editorial border border-stone-border bg-canvas p-6 sm:p-8">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-sage-botanical">
                    Verdict Preview &middot; Ready for Input
                  </span>
                  <h3 className="mt-2.5 font-serif text-2xl text-ink">
                    Three honest outcomes—never forced into hype or fear.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                    Choose a product from the catalogue, paste an INCI list from a bottle on your
                    shelf, or load one of the sample scenarios above, then select{" "}
                    <strong className="font-medium text-ink">Evaluate Product Fit</strong>.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-editorial border border-sage-muted bg-sage-soft/55 p-4">
                      <div className="flex items-center gap-2 font-medium text-forest">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="text-sm">1. Good potential fit</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                        Listed ingredients support your stated goals or routine step with no flagged
                        personal allergens or stacking conflicts—alongside clear caveats on
                        undisclosed concentrations.
                      </p>
                    </div>

                    <div className="rounded-editorial border border-clay/50 bg-clay-soft/65 p-4">
                      <div className="flex items-center gap-2 font-medium text-clay-deep">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="text-sm">2. Some concerns</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                        Flags specific personal sensitivity triggers, contradicted box claims, or
                        active routine overlaps (such as stacking multiple exfoliating acids) with
                        calm, non-alarmist context.
                      </p>
                    </div>

                    <div className="rounded-editorial border border-stone-strong bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <HelpCircle className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
                        <span className="text-sm">3. Not enough information</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                        Returned honestly whenever full INCI data is missing or unindexed—showing
                        exactly what packaging information is needed instead of guessing.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-8 border-t border-stone-border pt-4 text-xs leading-relaxed text-ink-muted">
                  Non-diagnostic cosmetic assessment: Dew &amp; Form never claims a product is
                  universally safe, clinically proven, or medically suitable for skin disease.
                </p>
              </div>
            ) : (
              <article
                aria-label={`Product Check Verdict: ${evaluation.verdictTitle}`}
                className="delight-toast-animate overflow-hidden rounded-editorial border border-stone-strong bg-canvas"
              >
                {/* Distinctive Verdict Crest Header */}
                <div
                  className={cn(
                    "border-b px-6 py-6 sm:px-7",
                    evaluation.verdict === "good_potential_fit" &&
                      "border-sage-muted bg-sage-soft/80",
                    evaluation.verdict === "some_concerns" && "border-clay/50 bg-clay-soft/85",
                    evaluation.verdict === "not_enough_info" && "border-stone-border bg-surface"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-editorial border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider",
                        evaluation.verdict === "good_potential_fit" &&
                          "border-forest bg-forest text-surface",
                        evaluation.verdict === "some_concerns" &&
                          "border-clay-deep bg-clay-deep text-surface",
                        evaluation.verdict === "not_enough_info" &&
                          "border-stone-strong bg-canvas text-ink"
                      )}
                    >
                      {evaluation.verdict === "good_potential_fit" && (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {evaluation.verdict === "some_concerns" && (
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {evaluation.verdict === "not_enough_info" && (
                        <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{evaluation.verdictTitle}</span>
                    </span>

                    <span className="font-mono text-[11px] text-ink-secondary">
                      {evaluation.dataConfidence.parsedInciCount} INCI entries &middot;{" "}
                      {evaluation.dataConfidence.matchedMonographCount} monographs matched
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-serif text-2xl text-ink">
                    {productName.trim() || "Evaluated Formulation"}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {brand.trim() || "Brand not specified"} &middot; {category}
                  </p>

                  <p className="mt-4 text-sm leading-relaxed text-ink">
                    {evaluation.conclusion}
                  </p>

                  {evaluation.verdict === "not_enough_info" && (
                    <button
                      type="button"
                      onClick={() => inciTextareaRef.current?.focus()}
                      className="btn-editorial-primary mt-4 min-h-[40px] px-4 py-2 text-xs"
                    >
                      <span>Add or complete INCI list</span>
                    </button>
                  )}
                </div>

                {/* Verdict Body Sections */}
                <div className="space-y-6 p-6 sm:p-7">
                  {/* Ingredient-Level vs Finished-Formulation Boundary Banner */}
                  <div className="rounded-editorial border border-stone-border bg-surface p-3.5 text-xs leading-relaxed text-ink-secondary">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert
                        className="mt-0.5 h-4 w-4 shrink-0 text-sage-botanical"
                        aria-hidden="true"
                      />
                      <p>{evaluation.finishedFormulaBoundaryNote}</p>
                    </div>
                  </div>

                  {/* Flagged Concerns (if any) */}
                  {evaluation.concerns.length > 0 && (
                    <div>
                      <h4 className="font-mono text-[11px] uppercase tracking-wider text-clay-deep">
                        Specific Potential Concerns ({evaluation.concerns.length})
                      </h4>
                      <ul className="mt-2.5 space-y-2">
                        {evaluation.concerns.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 rounded-editorial border border-clay/45 bg-clay-soft/45 p-3 text-xs leading-relaxed text-ink"
                          >
                            <AlertTriangle
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay-deep"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Supporting Reasons */}
                  {evaluation.supportingReasons.length > 0 && (
                    <div>
                      <h4 className="font-mono text-[11px] uppercase tracking-wider text-forest">
                        Reasons Supporting This Assessment
                      </h4>
                      <ul className="mt-2.5 space-y-2">
                        {evaluation.supportingReasons.map((reason, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 rounded-editorial border border-stone-border bg-surface p-3 text-xs leading-relaxed text-ink"
                          >
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest"
                              aria-hidden="true"
                            />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Routine Compatibility Pacing Notes */}
                  {evaluation.routineCompatibilityNotes.length > 0 && (
                    <div>
                      <h4 className="font-mono text-[11px] uppercase tracking-wider text-sage-botanical">
                        Routine Layering &amp; Pacing Notes
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-secondary">
                        {evaluation.routineCompatibilityNotes.map((note, idx) => (
                          <li key={idx}>&bull; {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Relevant Ingredient Explanations */}
                  {evaluation.ingredientExplanations.length > 0 && (
                    <div>
                      <h4 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                        Documented Ingredient Roles (CosIng / CIR)
                      </h4>
                      <div className="mt-2.5 space-y-2.5">
                        {evaluation.ingredientExplanations.slice(0, 6).map((note) => (
                          <div
                            key={`${note.position}-${note.monograph.id}`}
                            className="rounded-editorial border border-stone-border bg-surface p-3.5 text-xs"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="font-medium text-ink">
                                <span className="mr-1.5 font-mono text-[10px] text-ink-muted">
                                  #{String(note.position).padStart(2, "0")}
                                </span>
                                {note.monograph.commonName}
                              </span>
                              <span className="font-mono text-[10px] text-sage-botanical">
                                {note.monograph.statedRoles.slice(0, 2).join(" · ")}
                              </span>
                            </div>
                            <p className="mt-1 leading-relaxed text-ink-secondary">
                              {note.monograph.plainDescription}
                            </p>
                            {note.goalAlignmentLabels.length > 0 && (
                              <p className="mt-1.5 font-mono text-[10px] text-forest">
                                Matches your goal: {note.goalAlignmentLabels.join(", ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Claim Substantiation Check */}
                  {evaluation.claimAssessments.length > 0 && (
                    <div>
                      <h4 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                        Packaging Claim Substantiation Check
                      </h4>
                      <div className="mt-2.5 space-y-2">
                        {evaluation.claimAssessments.map((ca) => (
                          <div
                            key={ca.claim}
                            className="rounded-editorial border border-stone-border bg-surface p-3 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-ink">{ca.label}</span>
                              <span
                                className={cn(
                                  "rounded-editorial px-2 py-0.5 font-mono text-[10px] uppercase",
                                  ca.status === "ingredient_supported" &&
                                    "bg-sage-soft text-forest",
                                  ca.status === "contradicted_by_inci" &&
                                    "bg-clay-soft text-clay-deep",
                                  ca.status === "unverifiable_from_inci" &&
                                    "bg-canvas text-ink-secondary"
                                )}
                              >
                                {ca.status === "ingredient_supported"
                                  ? "Ingredient-level support"
                                  : ca.status === "contradicted_by_inci"
                                    ? "Contradicted by INCI"
                                    : "Unverifiable from INCI alone"}
                              </span>
                            </div>
                            <p className="mt-1 leading-relaxed text-ink-secondary">
                              {ca.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Confidence, Missing Info & Usage Cautions */}
                  <div className="grid grid-cols-1 gap-4 rounded-editorial border border-stone-border bg-surface p-4 text-xs sm:grid-cols-2">
                    <div>
                      <h4 className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        Data Confidence &amp; Provenance
                      </h4>
                      <p className="mt-1 font-medium text-ink">
                        {evaluation.dataConfidence.label}
                      </p>
                      <p className="mt-1 leading-relaxed text-ink-secondary">
                        Source: {evaluation.dataConfidence.provenanceLabel}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        Missing / Unverified Variables
                      </h4>
                      <ul className="mt-1 space-y-1 leading-relaxed text-ink-secondary">
                        {evaluation.missingInformation.map((m, idx) => (
                          <li key={idx}>&bull; {m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Usage Cautions */}
                  {evaluation.usageCautions.length > 0 && (
                    <div className="text-xs leading-relaxed text-ink-secondary">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        Practical Usage Cautions
                      </span>
                      <ul className="mt-1.5 space-y-1">
                        {evaluation.usageCautions.map((c, idx) => (
                          <li key={idx}>&bull; {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Source References */}
                  <div className="border-t border-stone-border pt-4 text-xs">
                    <h4 className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      Evidence &amp; Nomenclature Sources
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-ink-secondary">
                      {evaluation.sourceReferences.map((ref) => (
                        <li key={ref.id} className="leading-relaxed">
                          <strong className="font-medium text-ink">{ref.title}:</strong>{" "}
                          {ref.context}{" "}
                          {ref.url && (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-forest underline"
                            >
                              <span>Record link</span>
                              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Footer: Compare, Add to Routine, Inspect Full INCI */}
                  {evaluation.normalizedProduct && (
                    <div className="flex flex-wrap items-center gap-2.5 border-t border-stone-border pt-5">
                      <button
                        type="button"
                        onClick={() =>
                          onCompareEvaluatedProduct(evaluation.normalizedProduct!)
                        }
                        className="btn-editorial-primary min-h-[42px] px-4 py-2 text-xs"
                      >
                        <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Compare with another product</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onAddToRoutine(evaluation.normalizedProduct!, "morning")
                        }
                        className="btn-editorial-secondary min-h-[42px] px-3.5 py-2 text-xs"
                      >
                        <Sun className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                        <span>Save to AM Routine</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onAddToRoutine(evaluation.normalizedProduct!, "evening")
                        }
                        className="btn-editorial-secondary min-h-[42px] px-3.5 py-2 text-xs"
                      >
                        <Moon className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                        <span>Save to PM Routine</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectMonographs(evaluation.normalizedProduct!)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 px-2 text-xs font-medium text-forest underline decoration-forest/40 underline-offset-4 hover:text-forest-hover"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Full INCI monographs</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

# Dew & Form

> *Find your skin's kind of care.*

**Dew & Form** is an editorial skincare discovery, formulation-literacy, and evidence-based product intelligence studio powered by **Perfect Corp YouCam AI Skin Analysis (S2S API v2.1)** and the public **Open Beauty Facts** cosmetic INCI registry (**ODbL**). It combines optical AI skin insights, 35 documented European Commission **CosIng / CIR / EU Annex** ingredient monographs, transparent **Product Check** suitability assessments, calm side-by-side formulation comparisons, and a lightweight browser-persisted **My Routine** planner.

---

## Core Capabilities

- **5-Step Interactive First-Visit Onboarding Modal** — Accessible 5-step editorial modal popup over a blurred translucent backdrop (*Welcome to Dew & Form*, *Skin Analysis*, *Product Discovery & Comparison*, *Dew & Form Product Check*, *My Routine*) with in-place `Back`/`Next`/step-indicator navigation, direct workspace shortcuts, graceful `localStorage` persistence, and **Take a tour** replay controls in the header and footer.
- **Dew & Form Product Check (`#product-check`)** — Signature evidence-based evaluator that answers whether a product is a **Good potential fit**, raises **Some concerns**, or has **Not enough information**:
  - **Multi-Source Inputs**: Catalogue & EAN/UPC barcode search, manual product name & INCI entry, SSRF-hardened HTTPS product URL inspection (`POST /api/product-check/extract-url`), and binary-validated label photograph upload with an interactive magnification loupe (`POST /api/product-check/ocr`).
  - **Identity & Provenance Confirmation**: Editable product details before assessment, explicitly distinguishing user-confirmed physical packaging labels from crowd-contributed Open Beauty Facts records and unverified web pages.
  - **Concise Optional Personalisation**: Goals, skin type, personal sensitivities/custom allergens, saved routine active overlaps, and optional budget ceiling—with opt-in reuse of genuine live YouCam session scans.
  - **Strict Scientific Guardrails**: Distinguishes ingredient-level CosIng/CIR evidence from finished-formulation clinical proof, substantiates or flags contradicted box claims (e.g., *fragrance-free*, *non-comedogenic*, *clinically proven*), and never invents active concentrations, pH, or universal safety certifications.
- **Server-Proxied YouCam S2S v2.1 Integration (`#analysis` & `#insights`)** — Keeps `YOUCAM_API_KEY` strictly server-side (`import "server-only"`), executing File API initialization (`POST /s2s/v2.0/file`), pre-signed binary `PUT` transfer, verified v2.1 task creation (`POST /s2s/v2.1/task/skin-analysis`), and HMAC session-bound task polling (`GET /s2s/v2.1/task/skin-analysis/{task_id}`).
- **Open Beauty Facts INCI Registry & 35 CosIng/CIR Monographs (`#discovery`)** — Connects `GET /api/products` to **Open Beauty Facts** (`world.openbeautyfacts.org`, ODbL) to surface real cosmetic INCI declarations without fabricating retail prices or reviews, paired with 35 documented ingredient monographs and a personal **Shelf INCI Inspector**.
- **Upgraded Side-by-Side Formulation Comparison (`#comparison`)** — Compares 2–3 formulations across contextual personal fit, distinctive vs. shared INCI ingredients, sensitivity flags, goal alignment, verified price/size (when available), and data completeness.
- **Lightweight Persistent "My Routine" (`#my-routine`)** — Lets users assemble, save, and revisit AM & PM routines from products they already own or verified catalogue items in browser storage, explaining cosmetic step roles and flagging active layering conflicts (such as AHA/BHA + retinoid stacking or missing daytime SPF) without pushing unnecessary purchases.

---

## Environment Configuration

Copy `.env.example` to `.env.local` for local development (or configure server-side Environment Variables in Vercel Project Settings for `Production` and `Preview`):

```bash
cp .env.example .env.local
```

```env
# Server-only secret — NEVER prefix with NEXT_PUBLIC_
YOUCAM_API_KEY=your_perfect_corp_youcam_api_key
YOUCAM_API_BASE_URL=https://yce-api-01.makeupar.com
YOUCAM_ANALYSIS_MODE=sd

# Optional public Open Beauty Facts override (defaults to https://world.openbeautyfacts.org)
OPEN_BEAUTY_FACTS_BASE_URL=https://world.openbeautyfacts.org

# Optional server-only Label OCR integration boundary
# When unset, POST /api/product-check/ocr validates JPEG/PNG magic bytes and enables manual loupe transcription
PRODUCT_LABEL_OCR_ENDPOINT=
PRODUCT_LABEL_OCR_API_KEY=
```

---

## Scripts

```bash
npm run dev        # Start Next.js development server on 0.0.0.0:3000
npm run typecheck  # Run TypeScript strict check
npm run lint       # Run ESLint (--max-warnings=0)
npm test           # Run Vitest unit, API route, security & UI component suites
npm run build      # Build production Next.js bundle
```

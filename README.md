# Dew & Form

> *Find your skin's kind of care.*

**Dew & Form** is a skincare discovery and formulation-literacy web application powered by **Perfect Corp YouCam AI Skin Analysis (S2S API v2.1)** and the public **Open Beauty Facts** cosmetic INCI registry (**ODbL**). It combines optical AI skin insights, documented cosmetic ingredient transparency, and calm side-by-side product comparison in a warm beauty-editorial interface.

---

## Core Capabilities

- **Interactive First-Visit Onboarding Modal** — Accessible 4-step editorial modal popup over a blurred translucent backdrop (*Welcome to Dew & Form*, *Skin Analysis*, *Product Discovery & Comparison*, *Ingredient Explorer & Product Check*) with in-place step transitions, `Step 1 of 4` progress feedback, direct workspace shortcuts, graceful `localStorage` persistence, and **Take a tour** replay controls in the header and footer.
- **Editorial Landing & Methodology** — Introduces what optical camera skin analysis can observe, what INCI declarations document, and where clinical or personal patch-testing boundaries lie.
- **Skin Analysis Workspace** — Supports drag-and-drop, accessible file selection, and live browser camera capture (`getUserMedia`) with both client pre-checks and authoritative server-side binary magic-byte & dimension validation (`JPEG`/`PNG`, `< 10 MB`, `≥ 480 px` short side for Standard SD or `≥ 1080 px` for High-Definition HD).
- **Server-Proxied YouCam S2S v2.1 Integration** — Keeps `YOUCAM_API_KEY` strictly server-side (`import "server-only"`), executing the official File API initialization (`POST /s2s/v2.0/file`), pre-signed binary `PUT` transfer, conservative verified v2.1 task creation (`POST /s2s/v2.1/task/skin-analysis` with `["skin_type", "acne", "oiliness"]` SD / `["hd_skin_type", "hd_acne", "hd_oiliness"]` HD), and session-bound asynchronous task polling (`GET /s2s/v2.1/task/skin-analysis/{task_id}`).
- **Privacy, Session Ownership & Cost Discipline** — Binds created tasks to an `HttpOnly` session cookie via HMAC-SHA256 tokens so arbitrary or cross-session task IDs are rejected, enforces per-client rate limits, redacts secrets and pre-signed URLs, and resumes polling existing tasks on transient network interruptions without creating duplicate paid tasks.
- **Honest Personal Skin Insights** — Displays returned `ui_score` and `raw_score` values on YouCam's `1–100` condition index (never mislabeled as percentages), facial sub-region breakdowns, `skin_type` across Whole Face / T-Zone / U-Zone, toggleable detection overlays with 2-hour expiry awareness, and explicit listing of unrequested or unreturned fields (never defaulted to `0`).
- **Open Beauty Facts INCI Registry & Shelf Inspector** — Connects `GET /api/products` (and `?q=` search / EAN-UPC barcode lookup) to **Open Beauty Facts** (`world.openbeautyfacts.org`, ODbL) to surface real cosmetic products and genuine packaging INCI declarations without fabricating retail prices, ratings, or stock claims. Cross-references INCI lists against European Commission **CosIng** functional roles and **Cosmetic Ingredient Review (CIR)** evidence summaries, alongside a personal **Shelf INCI Inspector** modal and 4 non-commercial formulation reference archetypes.
- **Side-by-Side Formulation Comparison** — Compares 2–3 formulations across functional ingredient roles, shared INCI overlap, routine step, and disclosed price on desktop and mobile without inventing compatibility scores or winners.

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
```

When `YOUCAM_API_KEY` is omitted during local UI development, live analysis requests return an explicit configuration notice and offer clearly badged **Development Fixture** previews separated from live scans. Open Beauty Facts requires no API key and degrades gracefully to non-commercial formulation archetypes if offline.

---

## Scripts

```bash
npm run dev        # Start Next.js development server on 0.0.0.0:3000
npm run typecheck  # Run TypeScript strict check
npm run lint       # Run ESLint
npm test           # Run Vitest unit, API route & UI component suite
npm run build      # Build production Next.js bundle
```

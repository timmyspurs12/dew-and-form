import React from "react";
import { ArrowDownRight } from "lucide-react";

export function EditorialHero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="border-b border-stone-border bg-canvas pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24"
    >
      <div className="editorial-container">
        {/* Top Editorial Metadata Strip */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-border pb-4 sm:mb-12">
          <p className="eyebrow-label">
            Issue 01 &mdash; Considered Skincare &amp; Formulation Clarity
          </p>
          <p className="font-serif text-sm italic text-ink-secondary">
            Find your skin&apos;s kind of care.
          </p>
        </div>

        {/* Asymmetric 12-Column Editorial Composition */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Primary Editorial Typography & Actions (7 columns on desktop) */}
          <div className="flex flex-col justify-between lg:col-span-7 lg:pr-6">
            <div>
              <p className="eyebrow-label text-sage-botanical">
                Dew &amp; Form &middot; Skin Observation Studio
              </p>

              <h1
                id="hero-heading"
                className="mt-4 font-serif text-display-xl font-normal text-ink"
              >
                Your skin, understood.
              </h1>

              <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-ink-secondary sm:text-xl sm:leading-relaxed">
                Discover skin insights and explore skincare choices with a little more clarity.
              </p>

              <p className="mt-4 max-w-[36rem] text-sm leading-relaxed text-ink-secondary">
                Powered by YouCam AI Skin Analysis and documented cosmetic ingredient monographs—designed
                to translate optical skin readings and INCI labels into calm, unhurried context rather
                than prescriptive hype.
              </p>

              {/* Deliberate CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5 sm:mt-10">
                <a
                  href="#analysis"
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-editorial bg-forest px-6 py-3 text-sm font-medium tracking-wide text-surface transition-all duration-200 ease-editorial hover:bg-forest-hover"
                >
                  <span>Explore my skin</span>
                  <ArrowDownRight
                    className="h-4 w-4 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                    aria-hidden="true"
                  />
                </a>

                <a
                  href="#approach"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-editorial border border-stone-strong bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sage-soft/60"
                >
                  Discover the approach
                </a>
              </div>
            </div>

            {/* Editorial Ledger Footnotes */}
            <dl className="mt-12 grid grid-cols-1 gap-6 border-t border-stone-border pt-6 sm:grid-cols-3 sm:gap-5 lg:mt-16">
              <div className="sm:border-r sm:border-stone-border sm:pr-4">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  01 / Optical Signals
                </dt>
                <dd className="mt-1.5 text-sm leading-snug text-ink">
                  Zone-level texture, pore, tone, and moisture cues via YouCam S2S API.
                </dd>
              </div>

              <div className="sm:border-r sm:border-stone-border sm:pr-4">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  02 / INCI Literacy
                </dt>
                <dd className="mt-1.5 text-sm leading-snug text-ink">
                  Stated CosIng roles, published evidence context, and honest label limits.
                </dd>
              </div>

              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  03 / Non-Diagnostic
                </dt>
                <dd className="mt-1.5 text-sm leading-snug text-ink">
                  Informational skincare guidance—never a clinical verdict or invented score.
                </dd>
              </div>
            </dl>
          </div>

          {/* Editorial Still-Life Plate (5 columns on desktop) */}
          <div className="lg:col-span-5">
            <figure className="border border-stone-border bg-surface p-3 sm:p-4">
              <div className="relative aspect-[5/4] w-full overflow-hidden bg-canvas-subtle sm:aspect-[4/3] lg:aspect-[6/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/editorial-hero.jpg"
                  alt="Editorial still life of an unbranded frosted apothecary dropper bottle, travertine stone slab, porcelain dish with clear botanical serum droplet, and muted sage eucalyptus leaf in morning daylight."
                  className="h-full w-full object-cover object-center"
                />
              </div>

              <figcaption className="mt-3 flex items-start justify-between gap-4 border-t border-stone-border pt-3 text-xs leading-relaxed text-ink-secondary">
                <span>
                  <strong className="font-medium text-ink">Plate I.</strong> Unbranded botanical
                  serum study on honed travertine.
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  Still Life
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

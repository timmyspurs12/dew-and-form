import React from "react";

export function ApproachSection() {
  return (
    <section
      id="approach"
      aria-labelledby="approach-heading"
      className="border-b border-stone-border bg-surface py-16 sm:py-20 lg:py-24"
    >
      <div className="editorial-container">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Editorial Column (5 cols) */}
          <div className="lg:col-span-5">
            <p className="eyebrow-label text-sage-botanical">The Approach</p>
            <h2
              id="approach-heading"
              className="mt-3 font-serif text-display-md font-normal text-ink"
            >
              Observation before recommendation. Evidence before claims.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-secondary">
              Skincare shopping is crowded with exaggerated promises and opaque compatibility scores.
              Dew &amp; Form separates what an optical camera scan can observe, what an ingredient list
              actually documents, and what remains a matter of personal skin tolerance.
            </p>

            <figure className="mt-8 border border-stone-border bg-canvas p-3">
              <div className="aspect-[16/10] overflow-hidden bg-canvas-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/editorial-botanical.jpg"
                  alt="Close-up texture swatch of translucent hydrating gel-cream and water droplets across warm travertine stone and matte porcelain."
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-2.5 text-xs leading-relaxed text-ink-secondary">
                Formulation texture, vehicle pH, and concentration govern how an ingredient behaves
                on skin—details a single score can never replace.
              </figcaption>
            </figure>
          </div>

          {/* Right Staggered Editorial Ledger (7 cols) */}
          <div className="flex flex-col justify-center divide-y divide-stone-border border-t border-b border-stone-border lg:col-span-7">
            <article className="grid grid-cols-1 gap-3 py-7 sm:grid-cols-12 sm:gap-6 sm:py-8">
              <div className="sm:col-span-3">
                <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                  Principle 01
                </span>
                <p className="mt-1 text-xs font-medium text-sage-botanical">
                  Optical AI Scan
                </p>
              </div>
              <div className="sm:col-span-9">
                <h3 className="font-serif text-xl text-ink">
                  What YouCam AI Skin Analysis measures—and what it cannot
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  From a clear front-facing portrait, Perfect Corp&apos;s YouCam engine evaluates visual
                  surface cues—such as pore prominence, uneven tone, redness contrast, and fine expression
                  lines—on a <span className="font-medium text-ink">1–100 condition index</span> alongside
                  regional detection overlays. Because ambient lighting, camera focal length, and expression
                  affect every photograph, Dew &amp; Form presents both consumer-calibrated UI scores and
                  unadjusted raw model scores without framing them as medical diagnoses.
                </p>
              </div>
            </article>

            <article className="grid grid-cols-1 gap-3 py-7 sm:grid-cols-12 sm:gap-6 sm:py-8">
              <div className="sm:col-span-3">
                <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                  Principle 02
                </span>
                <p className="mt-1 text-xs font-medium text-sage-botanical">
                  INCI Transparency
                </p>
              </div>
              <div className="sm:col-span-9">
                <h3 className="font-serif text-xl text-ink">
                  Documented roles separated from missing label context
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  International Nomenclature of Cosmetic Ingredients (INCI) declarations tell you which
                  substances are present and their approximate order above 1%, yet rarely disclose exact
                  percentages, free-acid pH, or encapsulation. Our ingredient inspector links recognised
                  components to European Commission CosIng roles and Cosmetic Ingredient Review (CIR)
                  context while calling out those omissions plainly.
                </p>
              </div>
            </article>

            <article className="grid grid-cols-1 gap-3 py-7 sm:grid-cols-12 sm:gap-6 sm:py-8">
              <div className="sm:col-span-3">
                <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                  Principle 03
                </span>
                <p className="mt-1 text-xs font-medium text-sage-botanical">
                  Honest Comparisons
                </p>
              </div>
              <div className="sm:col-span-9">
                <h3 className="font-serif text-xl text-ink">
                  Side-by-side differences without manufactured winners
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  Whether two formulas suit your routine depends on climate, existing steps, budget, and
                  personal patch-test tolerance. Dew &amp; Form compares ingredient composition, functional
                  roles, fragrance presence, and price side by side—never inventing a compatibility
                  percentage or claiming a product is hypoallergenic from a photo.
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

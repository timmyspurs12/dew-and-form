import fs from "node:fs/promises";
import path from "node:path";
import React from "react";

export interface OgFontDescriptor {
  name: string;
  data: ArrayBuffer;
  style: "normal" | "italic";
  weight: 400 | 500 | 600;
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

let cachedOgFontsPromise: Promise<OgFontDescriptor[]> | null = null;

export function loadDewAndFormOgFonts(): Promise<OgFontDescriptor[]> {
  if (!cachedOgFontsPromise) {
    cachedOgFontsPromise = (async () => {
      const root = process.cwd();
      const [serifNormal, serifItalic, sansRegular, sansMedium, monoMedium] = await Promise.all([
        fs.readFile(
          path.join(
            root,
            "node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff"
          )
        ),
        fs.readFile(
          path.join(
            root,
            "node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-italic.woff"
          )
        ),
        fs.readFile(
          path.join(root, "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf")
        ),
        fs.readFile(
          path.join(root, "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf")
        ),
        fs.readFile(
          path.join(root, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf")
        ),
      ]);

      return [
        {
          name: "DM Serif Display",
          data: toArrayBuffer(serifNormal),
          style: "normal",
          weight: 400,
        },
        {
          name: "DM Serif Display",
          data: toArrayBuffer(serifItalic),
          style: "italic",
          weight: 400,
        },
        {
          name: "Geist Sans",
          data: toArrayBuffer(sansRegular),
          style: "normal",
          weight: 400,
        },
        {
          name: "Geist Sans",
          data: toArrayBuffer(sansMedium),
          style: "normal",
          weight: 500,
        },
        {
          name: "Geist Mono",
          data: toArrayBuffer(monoMedium),
          style: "normal",
          weight: 500,
        },
      ];
    })();
  }

  return cachedOgFontsPromise;
}

export function DewAndFormSocialCardMarkup() {
  const pillars = [
    {
      index: "01",
      tag: "SKIN ANALYSIS",
      title: "YouCam AI Skin Analysis v2.1",
      detail: "Optical skin-type, oiliness & blemish signals",
    },
    {
      index: "02",
      tag: "PRODUCT CHECK",
      title: "35 CosIng & CIR Monographs",
      detail: "Evidence-graded fit, sensitivity & claim checks",
    },
    {
      index: "03",
      tag: "FORMULATION STUDIO",
      title: "Open Beauty Facts + My Routine",
      detail: "Side-by-side INCI comparison & AM/PM harmony",
    },
  ];

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        backgroundColor: "#F7F5EF",
        padding: "28px",
        fontFamily: '"Geist Sans", sans-serif',
        color: "#292C27",
        position: "relative",
      }}
    >
      {/* Editorial outer frame */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          border: "1px solid #D6D1C4",
          backgroundColor: "#FAF8F2",
          padding: "46px 52px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle top-right sage botanical wash */}
        <div
          style={{
            position: "absolute",
            top: "-110px",
            right: "-90px",
            width: "420px",
            height: "420px",
            borderRadius: "9999px",
            backgroundColor: "#E5E9DE",
            opacity: 0.7,
            display: "flex",
          }}
        />

        {/* Left Editorial Column */}
        <div
          style={{
            width: "600px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: "28px",
          }}
        >
          {/* Brand Seal + Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                backgroundColor: "#26382F",
                border: "1px solid #4A5A44",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: "28px",
                  color: "#F7F5EF",
                  lineHeight: 1,
                }}
              >
                D
              </span>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "9999px",
                  backgroundColor: "#B8CCB0",
                  position: "absolute",
                  top: "9px",
                  right: "8px",
                  display: "flex",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: "26px",
                  color: "#292C27",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.05,
                }}
              >
                Dew &amp; Form
              </span>
              <span
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  color: "#4A5A44",
                }}
              >
                SKINCARE INTELLIGENCE &amp; INCI STUDIO
              </span>
            </div>
          </div>

          {/* Main Display Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: '"DM Serif Display", serif',
                fontSize: "66px",
                lineHeight: 1.03,
                letterSpacing: "-0.02em",
                color: "#292C27",
              }}
            >
              <span>Find your skin’s</span>
              <span
                style={{
                  fontStyle: "italic",
                  color: "#26382F",
                }}
              >
                kind of care.
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: "20px",
                lineHeight: 1.48,
                color: "#565950",
                maxWidth: "545px",
              }}
            >
              Calm, evidence-graded skincare discovery powered by AI skin observation,
              documented INCI monographs, and honest formulation comparison.
            </p>
          </div>

          {/* Bottom Provenance Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              paddingTop: "18px",
              borderTop: "1px solid #DDD8CD",
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                backgroundColor: "#E5E9DE",
                border: "1px solid #C2CEBC",
                borderRadius: "3px",
                fontFamily: '"Geist Mono", monospace',
                fontSize: "12px",
                color: "#26382F",
                letterSpacing: "0.04em",
                display: "flex",
              }}
            >
              INCI TRANSPARENCY
            </div>
            <span
              style={{
                fontSize: "14px",
                color: "#686B61",
              }}
            >
              Non-clinical cosmetic guidance · Zero hype claims
            </span>
          </div>
        </div>

        {/* Right Editorial Specimen Panel */}
        <div
          style={{
            width: "418px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#FFFEFA",
            border: "1px solid #D6D1C4",
            borderRadius: "4px",
            padding: "28px 28px 24px 28px",
            boxShadow: "0 14px 34px rgba(38, 56, 47, 0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "14px",
              borderBottom: "1px solid #E6E1D6",
            }}
          >
            <span
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: "11px",
                letterSpacing: "0.14em",
                color: "#565950",
              }}
            >
              STUDIO DOSSIER
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "2px",
                backgroundColor: "#F1F5ED",
                border: "1px solid #8EA486",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "9999px",
                  backgroundColor: "#26382F",
                  display: "flex",
                }}
              />
              <span
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: "11px",
                  color: "#26382F",
                }}
              >
                LIVE v2.1
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginTop: "6px",
              marginBottom: "6px",
            }}
          >
            {pillars.map((pillar) => (
              <div
                key={pillar.index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "13px 15px",
                  backgroundColor: "#F7F5EF",
                  border: "1px solid #E3DECFE6",
                  borderRadius: "3px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    color: "#4A5A44",
                  }}
                >
                  <span>{pillar.index}</span>
                  <span>·</span>
                  <span>{pillar.tag}</span>
                </div>
                <span
                  style={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: "21px",
                    color: "#292C27",
                    lineHeight: 1.18,
                  }}
                >
                  {pillar.title}
                </span>
                <span
                  style={{
                    fontSize: "13.5px",
                    color: "#565950",
                    lineHeight: 1.35,
                  }}
                >
                  {pillar.detail}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "12px",
              borderTop: "1px solid #E6E1D6",
              fontFamily: '"Geist Mono", monospace',
              fontSize: "11px",
              color: "#686B61",
            }}
          >
            <span>COSING · CIR · ODbL</span>
            <span style={{ color: "#26382F" }}>DEW &amp; FORM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

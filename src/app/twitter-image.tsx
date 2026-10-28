import { ImageResponse } from "next/og";
import {
  DewAndFormSocialCardMarkup,
  loadDewAndFormOgFonts,
} from "@/lib/seo/social-card";

export const runtime = "nodejs";
export const alt =
  "Dew & Form — Find your skin's kind of care. AI skin observation, 35-monograph INCI Product Check, and calm side-by-side formulation comparison.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function TwitterImage() {
  const fonts = await loadDewAndFormOgFonts();

  return new ImageResponse(<DewAndFormSocialCardMarkup />, {
    ...size,
    fonts,
  });
}

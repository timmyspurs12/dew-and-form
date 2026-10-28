import { ImageResponse } from "next/og";
import { loadDewAndFormOgFonts } from "@/lib/seo/social-card";

export const runtime = "nodejs";
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default async function AppleIcon() {
  const fonts = await loadDewAndFormOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#26382F",
          padding: "14px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            border: "2px solid rgba(184, 204, 176, 0.45)",
            borderRadius: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <span
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: "104px",
              color: "#F7F5EF",
              lineHeight: 1,
              marginTop: "-4px",
              marginRight: "8px",
            }}
          >
            D
          </span>
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "9999px",
              backgroundColor: "#B8CCB0",
              position: "absolute",
              top: "26px",
              right: "26px",
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    }
  );
}

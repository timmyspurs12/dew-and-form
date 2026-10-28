import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/dm-serif-display/400-italic.css";
import "./globals.css";
import { resolveSiteMetadataBase } from "@/lib/seo/metadata-base";

const SITE_TITLE = "Dew & Form — Find your skin's kind of care.";
const SITE_DESCRIPTION =
  "Calm, evidence-graded skincare discovery powered by YouCam AI Skin Analysis v2.1, 35 CosIng/CIR INCI monographs, Product Check suitability, and side-by-side formulation comparison.";

export const metadata: Metadata = {
  metadataBase: resolveSiteMetadataBase(),
  applicationName: "Dew & Form",
  title: {
    default: SITE_TITLE,
    template: "%s | Dew & Form",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Dew & Form",
    "skincare analysis",
    "YouCam AI Skin Analysis",
    "INCI ingredients",
    "Open Beauty Facts",
    "Product Check",
    "formulation comparison",
    "skincare routine builder",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Dew & Form",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F5EF",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      style={
        {
          "--font-editorial": '"DM Serif Display", Georgia, "Times New Roman", serif',
        } as React.CSSProperties
      }
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

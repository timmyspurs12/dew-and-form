import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/dm-serif-display/400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dew & Form — Find your skin's kind of care.",
  description:
    "A considered approach to skincare discovery, powered by YouCam AI Skin Analysis, documented INCI ingredient transparency, and calm side-by-side formulation comparison.",
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

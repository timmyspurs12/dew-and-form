import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#F7F5EF",
          subtle: "#EFECE3",
        },
        surface: {
          DEFAULT: "#FFFEFA",
          elevated: "#FAF8F2",
        },
        sage: {
          soft: "#E5E9DE",
          muted: "#D5DDD0",
          botanical: "#4A5A44",
        },
        forest: {
          DEFAULT: "#26382F",
          hover: "#1D2B24",
        },
        stone: {
          warm: "#DAD5CA",
          border: "#DDD8CD",
          strong: "#BFB9AC",
        },
        ink: {
          DEFAULT: "#292C27",
          secondary: "#565950",
          muted: "#686B61",
        },
        clay: {
          DEFAULT: "#A86E5A",
          soft: "#F3E8E3",
          deep: "#784635",
        },
      },
      fontFamily: {
        serif: ["var(--font-editorial)", "DM Serif Display", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.5rem, 5vw, 4.35rem)", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2rem, 3.6vw, 3.1rem)", { lineHeight: "1.08", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.5rem, 2.4vw, 2.15rem)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-sm": ["clamp(1.2rem, 1.8vw, 1.5rem)", { lineHeight: "1.22", letterSpacing: "-0.005em" }],
      },
      borderRadius: {
        editorial: "2px",
        subtle: "4px",
        card: "6px",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;

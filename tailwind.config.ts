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
          DEFAULT: "var(--color-canvas)",
          subtle: "var(--color-canvas-subtle)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
        },
        sage: {
          soft: "var(--color-sage-soft)",
          muted: "var(--color-sage-muted)",
          botanical: "var(--color-botanical)",
        },
        forest: {
          DEFAULT: "var(--color-forest)",
          hover: "var(--color-forest-hover)",
        },
        stone: {
          warm: "var(--color-stone)",
          border: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        ink: {
          DEFAULT: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        clay: {
          DEFAULT: "var(--color-clay)",
          soft: "var(--color-clay-soft)",
          deep: "var(--color-clay-deep)",
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

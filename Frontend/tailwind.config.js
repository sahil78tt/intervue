/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Brand & Accent ---
        primary: {
          DEFAULT: "#5e6ad2",
          hover: "#828fff",
          focus: "#5e69d1",
        },
        "brand-secure": "#7a7fad",

        // --- Canvas & Surfaces ---
        canvas: "#010102",
        "surface-1": "#0f1011",
        "surface-2": "#141516",
        "surface-3": "#18191a",
        "surface-4": "#191a1b",

        // --- Hairlines / Borders ---
        hairline: "#23252a",
        "hairline-strong": "#34343a",
        "hairline-tertiary": "#3e3e44",

        // --- Ink / Text ---
        ink: "#f7f8f8",
        "ink-muted": "#d0d6e0",
        "ink-subtle": "#8a8f98",
        "ink-tertiary": "#62666d",

        // --- Inverse (for white CTA button) ---
        "inverse-canvas": "#ffffff",
        "inverse-surface-1": "#f5f6f6",
        "inverse-surface-2": "#f6f7f7",
        "inverse-ink": "#000000",

        // --- Semantic ---
        "semantic-success": "#27a644",
        "semantic-overlay": "#000000",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
      },

      fontSize: {
        "display-xl": [
          "80px",
          { lineHeight: "1.05", letterSpacing: "-3px", fontWeight: "600" },
        ],
        "display-lg": [
          "56px",
          { lineHeight: "1.10", letterSpacing: "-1.8px", fontWeight: "600" },
        ],
        "display-md": [
          "40px",
          { lineHeight: "1.15", letterSpacing: "-1px", fontWeight: "600" },
        ],
        headline: [
          "28px",
          { lineHeight: "1.20", letterSpacing: "-0.6px", fontWeight: "600" },
        ],
        "card-title": [
          "22px",
          { lineHeight: "1.25", letterSpacing: "-0.4px", fontWeight: "500" },
        ],
        subhead: [
          "20px",
          { lineHeight: "1.40", letterSpacing: "-0.2px", fontWeight: "400" },
        ],
        "body-lg": [
          "18px",
          { lineHeight: "1.50", letterSpacing: "-0.1px", fontWeight: "400" },
        ],
        body: [
          "16px",
          { lineHeight: "1.50", letterSpacing: "-0.05px", fontWeight: "400" },
        ],
        "body-sm": [
          "14px",
          { lineHeight: "1.50", letterSpacing: "0", fontWeight: "400" },
        ],
        caption: [
          "12px",
          { lineHeight: "1.40", letterSpacing: "0", fontWeight: "400" },
        ],
        btn: [
          "14px",
          { lineHeight: "1.20", letterSpacing: "0", fontWeight: "500" },
        ],
        eyebrow: [
          "13px",
          { lineHeight: "1.30", letterSpacing: "0.4px", fontWeight: "500" },
        ],
        "mono-sm": [
          "13px",
          { lineHeight: "1.50", letterSpacing: "0", fontWeight: "400" },
        ],
      },

      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        xxl: "24px",
        pill: "9999px",
        full: "9999px",
      },

      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "96px",
      },
    },
  },
  plugins: [],
};

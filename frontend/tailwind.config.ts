import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: "#2DD4BF",   // teal — primary CTA color
          dark: "#14B8A6",
          muted: "#0D9488",
        },
        // Surface
        surface: {
          DEFAULT: "#141414",   // page bg
          card: "#1E1E1E",      // card bg
          elevated: "#2A2A2A",  // modal/sheet bg
          border: "#333333",
        },
        // Terpene palette — each terpene gets a consistent color
        terp: {
          myrcene:        "#F97316",  // orange
          caryophyllene:  "#8B5CF6",  // purple
          limonene:       "#EAB308",  // yellow
          pinene:         "#22C55E",  // green
          linalool:       "#EC4899",  // pink
          humulene:       "#A78BFA",  // light purple
          terpinolene:    "#06B6D4",  // cyan
          ocimene:        "#84CC16",  // lime
          bisabolol:      "#F472B6",  // rose
          other:          "#6B7280",  // gray fallback
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      animation: {
        "fade-up": "fadeUp 0.3s ease-out",
        "slide-in": "slideIn 0.25s ease-out",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

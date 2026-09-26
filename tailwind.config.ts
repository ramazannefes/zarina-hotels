import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Zarina × Expedia-inspired travel palette
        // Token names stay stable across re-themes.
        ink: {
          DEFAULT: "#1F2A44", // slate-navy text
          soft: "#39415C",
          muted: "#5F6B85",
        },
        sand: {
          // neutral greys for borders & surfaces (Expedia-style)
          50: "#F6F7F9",
          100: "#EDF0F4",
          200: "#DEE3EC",
          300: "#C7CFDD",
        },
        gold: {
          // "gold" token = brand action blue
          200: "#C2E3FF",
          300: "#8FD0FF",
          400: "#3D9BF5", // primary action blue
          500: "#1A7FE8",
          600: "#0A66C2", // brand deep blue
          700: "#084F94",
        },
        wine: {
          // "wine" token = deep navy for hover/dark accents
          400: "#274B8F",
          500: "#1D3E7C",
          600: "#163266",
          700: "#102550",
          800: "#0B1B3B",
        },
        emerald: {
          // success / review-score green
          100: "#DDF5E4",
          300: "#8FDCAC",
          500: "#1F9D55",
          600: "#17804A",
          700: "#12663B",
          900: "#0A3B23",
        },
        sea: {
          100: "#E3F1FD",
          300: "#9CCFF7",
          500: "#3D9BF5",
          700: "#0A66C2",
        },
        cream: "#FFFFFF", // Expedia-style white canvas
      },
      fontFamily: {
        display: ["var(--font-body)", "system-ui", "sans-serif"], // sans headings, OTA style
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.08em",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #3D9BF5 0%, #0A66C2 100%)",
        "wine-gradient": "linear-gradient(135deg, #1D3E7C 0%, #0B1B3B 100%)",
        "ink-gradient": "linear-gradient(160deg, #0B1B3B 0%, #163266 100%)",
        "shimmer": "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.35) 50%, transparent 75%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,46,0.06), 0 4px 16px rgba(15,27,46,0.08)",
        lift: "0 2px 6px rgba(15,27,46,0.1), 0 14px 36px rgba(15,27,46,0.16)",
        gold: "0 4px 14px rgba(61,155,245,0.4)",
        wine: "0 4px 14px rgba(16,37,80,0.4)",
        emerald: "0 4px 14px rgba(31,157,85,0.3)",
      },
      borderRadius: {
        // Expedia uses friendly, generous radii
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        xl2: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "zoom-soft": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1) translateY(0)" },
          "100%": { transform: "scale(1.08) translateY(-1.5%)" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.9s ease both",
        "zoom-soft": "zoom-soft 0.7s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 2.8s linear infinite",
        "ken-burns": "ken-burns 18s ease-out both",
        "float-soft": "float-soft 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

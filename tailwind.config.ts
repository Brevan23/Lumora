import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FBF7F0",
        ink: "#1E1B16",
        sand: "#E9E0D2",
        espresso: "#16120E",
        muted: "#6B6256",
        line: "#ECE3D4",
        amber: {
          DEFAULT: "#E0A140",
          soft: "#EBC07E",
          deep: "#C7842A",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1120px",
        prose: "680px",
      },
      boxShadow: {
        glow: "0 0 90px -8px rgba(224,161,64,0.55)",
        soft: "0 1px 2px rgba(30,27,22,0.05), 0 8px 24px -12px rgba(30,27,22,0.14)",
        card: "0 1px 2px rgba(30,27,22,0.04), 0 12px 32px -16px rgba(30,27,22,0.18)",
        lift: "0 1px 2px rgba(30,27,22,0.05), 0 20px 40px -20px rgba(30,27,22,0.28)",
        "glow-amber": "0 6px 22px -6px rgba(224,161,64,0.45)",
        "glow-amber-sm": "0 2px 12px -2px rgba(224,161,64,0.40)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowpulse: {
          "0%, 100%": { opacity: "0.82" },
          "50%": { opacity: "1" },
        },
        glowdrift: {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)", opacity: "0.8" },
          "50%": { transform: "translate(-50%, -52%) scale(1.05)", opacity: "0.95" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        glowpulse: "glowpulse 7s ease-in-out infinite",
        glowdrift: "glowdrift 24s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

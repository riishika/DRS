import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0f",
          50: "#0f0f18",
          100: "#141420",
          200: "#1a1a2e",
          300: "#22223a"
        },
        accent: {
          teal: "#2ec4b6",
          gold: "#f2c14e",
          rose: "#ff6b6b",
          lime: "#84f542",
          purple: "#a78bfa"
        }
      },
      animation: {
        "fade-in": "fade-in-up 0.5s ease-out forwards",
        "pulse-slow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite"
      },
      boxShadow: {
        "glow-teal": "0 0 20px rgba(46, 196, 182, 0.15), 0 0 60px rgba(46, 196, 182, 0.05)",
        "glow-gold": "0 0 20px rgba(242, 193, 78, 0.15), 0 0 60px rgba(242, 193, 78, 0.05)",
        "glow-lime": "0 0 20px rgba(132, 245, 66, 0.2), 0 0 60px rgba(132, 245, 66, 0.08)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.05)"
      }
    }
  },
  plugins: []
};

export default config;

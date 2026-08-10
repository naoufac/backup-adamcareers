import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adam: {
          DEFAULT: "#2c7488",
          50: "#f0f7f8",
          100: "#d9ebee",
          200: "#b3d7dd",
          300: "#7eb7c4",
          400: "#4a91a3",
          500: "#2c7488",
          600: "#1d5d70",
          700: "#0f4c5c",
          800: "#0a3744",
          900: "#062430",
          accent: "#e36414",
          accentLight: "#ff8124",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out",
        "fade-in": "fadeIn 0.8s ease-out",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

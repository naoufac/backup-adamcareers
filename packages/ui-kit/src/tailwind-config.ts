import type { Config } from "tailwindcss";

export const themeConfig: Config["theme"] = {
  extend: {
    colors: {
      adam: {
        50: "#f0f7f8",
        100: "#d9ebee",
        200: "#b3d7dd",
        300: "#8dc2cc",
        400: "#67aebb",
        500: "#2c7488",
        600: "#1d5d70",
        700: "#0f4c5c",
        800: "#0a3b48",
        900: "#062a33",
        accent: "#e36414",
      },
    },
    fontFamily: {
      sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      serif: ["Georgia", "Times New Roman", "serif"],
    },
  },
};

export default themeConfig;

import type { Config } from "tailwindcss";
import { themeConfig } from "./src/tailwind-config.js";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: themeConfig,
  },
  plugins: [],
};

export { themeConfig };
export default config;

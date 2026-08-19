import type { Config } from "tailwindcss";
import { themeConfig } from "@adamjobs/ui-kit/tailwind.config";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "../../packages/ui-kit/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: themeConfig,
  },
  plugins: [],
};

export default config;

/**
 * Shared design tokens for AdamCareers web.
 *
 * Tailwind is the primary styling system. These tokens are the canonical
 * runtime values for anything that needs the raw hex (canvas, charts, dynamic
 * styles, third-party components, cross-project sharing).
 *
 * Keep Tailwind config in sync: apps/web/tailwind.config.ts should import the
 * same color map from here if possible, or vice versa.
 */

export const adamColors = {
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
} as const;

export const semanticColors = {
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  success: "#16a34a",
  successBg: "#f0fdf4",
} as const;

export const layoutTokens = {
  maxWidth: {
    app: "1280px",
    narrow: "768px",
    landing: "1152px",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
  },
} as const;

export const fontTokens = {
  sans: "Inter, system-ui, sans-serif",
} as const;

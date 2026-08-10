/**
 * Shared navigation configuration for AdamCareers web.
 *
 * This is the single source of truth for every top-level link.
 * Do NOT hardcode nav links in individual pages or headers.
 *
 * Modes:
 * - marketing: public site (landing, pricing, demo, auth)
 * - app: authenticated dashboard and tools
 */

export type Locale = "fr" | "en";

export type NavMode = "marketing" | "app";

export interface NavLink {
  href: string;
  label: Record<Locale, string>;
  /** only show in app mode */
  appOnly?: boolean;
  /** only show in marketing mode */
  marketingOnly?: boolean;
  /** links to external URL */
  external?: boolean;
  /** if true, included in the mobile drawer */
  mobile?: boolean;
  /** if true, highlighted as primary CTA */
  primary?: boolean;
}

export const MARKETING_LINKS: NavLink[] = [
  { href: "#features", label: { fr: "Fonctionnalités", en: "Features" }, marketingOnly: true },
  { href: "#demo", label: { fr: "Démo", en: "Demo" }, marketingOnly: true },
  { href: "#pricing", label: { fr: "Tarifs", en: "Pricing" }, marketingOnly: true },
  { href: "/auth", label: { fr: "Connexion", en: "Sign in" }, marketingOnly: true },
  { href: "/auth", label: { fr: "Commencer gratuitement", en: "Get started" }, marketingOnly: true, primary: true },
];

export const APP_LINKS: NavLink[] = [
  { href: "/app", label: { fr: "Tableau de bord", en: "Dashboard" }, appOnly: true },
  { href: "/app/offers/new", label: { fr: "Adapter", en: "Adapt" }, appOnly: true },
  { href: "/app/builder", label: { fr: "CV", en: "CV" }, appOnly: true },
  { href: "/app/upload", label: { fr: "Importer", en: "Import" }, appOnly: true },
];

export const USER_DROPDOWN_LINKS: NavLink[] = [
  { href: "/app/account", label: { fr: "Mon compte", en: "Account" }, appOnly: true },
];

export const ACCOUNT_LINKS: NavLink[] = [
  { href: "/app/account", label: { fr: "Mon compte", en: "Account" }, appOnly: true },
];

export function label(link: NavLink, locale: Locale): string {
  return link.label[locale] ?? link.label.en ?? link.label.fr;
}

export function linksForMode(mode: NavMode): NavLink[] {
  return mode === "marketing" ? MARKETING_LINKS : APP_LINKS;
}

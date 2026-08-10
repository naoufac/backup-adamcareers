"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./logo";
import { linksForMode, label, type NavMode, ACCOUNT_LINKS } from "@/lib/nav";

interface SiteNavProps {
  mode: NavMode;
}

export function SiteNav({ mode }: SiteNavProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale: "fr" | "en" = (user?.locale as "fr" | "en") ?? "fr";
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth");
  };

  const links = linksForMode(mode).filter((l) => !l.external);
  const isActive = (href: string) => {
    if (href === "/app") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navLinkClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-adam-50 text-adam-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-adam-700"
    }`;

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href={mode === "app" ? "/app" : "/"} className="flex items-center gap-2">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 sm:flex">
          {links.map((l) =>
            l.primary ? null : (
              <Link
                key={l.href + l.label.fr}
                href={l.href}
                className={navLinkClass(isActive(l.href))}
              >
                {label(l, locale)}
              </Link>
            )
          )}

          {mode === "app" && user && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-200" />
              <Link href="/app/account" className={navLinkClass(isActive("/app/account"))}>
                {label(ACCOUNT_LINKS[0], locale)}
              </Link>
              <button
                onClick={doLogout}
                className="ml-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-red-600"
                title={locale === "en" ? "Log out" : "Déconnexion"}
              >
                {locale === "en" ? "Logout" : "Déconnexion"}
              </button>
            </>
          )}

          {mode === "marketing" && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-200" />
              <Link
                href="/auth"
                className="rounded-lg bg-adam-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-adam-800"
              >
                {locale === "en" ? "Get started" : "Commencer gratuitement"}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-50 sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={locale === "en" ? "Open menu" : "Ouvrir le menu"}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) =>
              l.primary ? null : (
                <Link
                  key={l.href + l.label.fr}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive(l.href) ? "bg-adam-50 text-adam-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label(l, locale)}
                </Link>
              )
            )}
            {mode === "app" && user && (
              <>
                <Link
                  href="/app/account"
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive("/app/account") ? "bg-adam-50 text-adam-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label(ACCOUNT_LINKS[0], locale)}
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    doLogout();
                  }}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-600"
                >
                  {locale === "en" ? "Logout" : "Déconnexion"}
                </button>
              </>
            )}
            {mode === "marketing" && (
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-adam-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-adam-800"
              >
                {locale === "en" ? "Get started" : "Commencer gratuitement"}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export function AppHeader() {
  return <SiteNav mode="app" />;
}

export function MarketingNav() {
  return <SiteNav mode="marketing" />;
}

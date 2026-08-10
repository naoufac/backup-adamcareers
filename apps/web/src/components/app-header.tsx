"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./logo";

const links = [
  { href: "/app/offers/new", label: "Adapter", labelEn: "Adapt" },
  { href: "/app/builder", label: "CV", labelEn: "CV" },
];

export function AppHeader() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (user?.locale as "fr" | "en") ?? "fr";

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/auth");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/app" className="flex items-center gap-2">
          <Logo />
        </Link>

        <div className="flex items-center gap-1 sm:gap-4">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${
                  active
                    ? "bg-adam-50 text-adam-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-adam-700"
                }`}
              >
                {locale === "en" ? l.labelEn : l.label}
              </Link>
            );
          })}

          <Link
            href="/app/account"
            className={`hidden rounded-lg px-3 py-1.5 text-sm font-medium transition sm:block ${
              pathname === "/app/account"
                ? "bg-adam-50 text-adam-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-adam-700"
            }`}
          >
            {locale === "en" ? "Account" : "Compte"}
          </Link>

          <button
            onClick={logout}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-red-600 sm:px-3"
            title={locale === "en" ? "Log out" : "Déconnexion"}
          >
            <span className="hidden sm:inline">{locale === "en" ? "Logout" : "Déconnexion"}</span>
            <svg className="h-5 w-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

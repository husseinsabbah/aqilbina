"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { defaultLocale, getLocaleFromStorage, messages, type Locale } from "@/lib/i18n";

const menuItems = [
  { key: "home", href: "/" },
  {
    key: "ia",
    children: [
      { label: "Scan 3D", href: "/ia/scan-3d" },
      { label: "Analyse", href: "/ia/analyse" },
      { label: "Conseil", href: "/ia/conseil" },
      { label: "Tutoriels", href: "/ia/tutoriels" },
      { label: "Assistant IA", href: "/assistant" },
    ],
  },
  { key: "casUsage", href: "/cas-d-usage" },
  { key: "tarifs", href: "/#tarifs" },
  {
    key: "appareils",
    children: [
      { label: "Mobile", href: "/appareils/mobile" },
      { label: "Casques AR", href: "/appareils/casques-ar" },
      { label: "Intégrations", href: "/appareils/integrations" },
    ],
  },
  {
    key: "aide",
    children: [
      { label: "Docs", href: "/aide/docs" },
      { label: "FAQ", href: "/aide/faq" },
      { label: "Actus", href: "/aide/actus" },
    ],
  },
  { key: "contact", href: "/contact" }
];

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setMounted(true);
    setLocaleState(getLocaleFromStorage());
  }, []);

  const effectiveLocale = mounted ? locale : defaultLocale;
  const dict = messages[effectiveLocale];
  const user = session?.user;
  const displayName = user?.companyName || user?.name || "Artisan";
  const authReady = mounted && status !== "loading";
  const isAuthenticated = authReady && status === "authenticated";
  const renderGuestActions = !mounted || !authReady || !isAuthenticated;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/", redirect: true });
    router.push("/");
  };

  return (
    <Fragment>
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm" suppressHydrationWarning>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-xl font-black text-slate-900">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg shadow-md shadow-emerald-200">🏗️</span>
          <span className="text-2xl font-black tracking-tight text-blue-700">Aqil Bina</span>
        </button>

        <nav className="hidden flex-1 items-center justify-center lg:flex">
          <div className="flex max-w-full items-center gap-0.5 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden">
            {menuItems.map((item) =>
              item.children ? (
                <div key={item.key} className="group relative shrink-0">
                  <button className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 xl:px-2.5 xl:text-xs">
                    {dict.nav[item.key as keyof typeof dict.nav]}
                    <ChevronDown className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                  </button>
                  <div className="invisible absolute left-0 top-full z-20 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100">
                    {item.children.map((child) => (
                      <button
                        key={child.label}
                        onClick={() => {
                          setMobileOpen(false);
                          router.push(child.href);
                        }}
                        className="block w-full rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  key={item.key}
                  onClick={() => router.push(item.href || "/")}
                  className="shrink-0 rounded-full px-2 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 xl:px-2.5 xl:text-xs"
                >
                  {dict.nav[item.key as keyof typeof dict.nav]}
                </button>
              )
            )}
          </div>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            onClick={() => router.push("/assistant")}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            Assistant IA
          </button>
          <LocaleSwitcher />
          {renderGuestActions ? (
            <>
              <button
                onClick={() => router.push("/auth/signin")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Connexion
              </button>
              <button
                onClick={() => router.push("/auth/signup")}
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                Inscription
              </button>
              <button
                onClick={() => router.push("/abonnement")}
                className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:translate-y-[-1px] hover:shadow-xl"
              >
                Essai gratuit
              </button>
            </>
          ) : isAuthenticated ? (
            <>
              <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                <User className="h-4 w-4" />
                {displayName}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                {dict.nav.logout}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/auth/signin")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Connexion
              </button>
              <button
                onClick={() => router.push("/auth/signup")}
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                Inscription
              </button>
              <button
                onClick={() => router.push("/abonnement")}
                className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:translate-y-[-1px] hover:shadow-xl"
              >
                Essai gratuit
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Ouvrir le menu mobile"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                {item.children ? (
                  <button
                    onClick={() => setOpenMobileGroup(openMobileGroup === item.key ? null : item.key)}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800"
                  >
                    <span>{dict.nav[item.key as keyof typeof dict.nav]}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openMobileGroup === item.key ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <button onClick={() => { setMobileOpen(false); router.push(item.href || "/"); }} className="w-full text-left text-sm font-semibold text-slate-800">
                    {dict.nav[item.key as keyof typeof dict.nav]}
                  </button>
                )}
                {item.children && openMobileGroup === item.key && (
                  <div className="mt-2 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.label}
                        onClick={() => {
                          setMobileOpen(false);
                          router.push(child.href);
                        }}
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-white"
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            {renderGuestActions ? (
              <>
                <button
                  onClick={() => router.push("/auth/signin")}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Connexion
                </button>
                <button
                  onClick={() => router.push("/auth/signup")}
                  className="flex-1 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
                >
                  Inscription
                </button>
                <button
                  onClick={() => router.push("/abonnement")}
                  className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Essai gratuit
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <button
                  onClick={handleSignOut}
                  className="flex-1 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push("/auth/signin")}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Connexion
                </button>
                <button
                  onClick={() => router.push("/auth/signup")}
                  className="flex-1 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
                >
                  Inscription
                </button>
                <button
                  onClick={() => router.push("/abonnement")}
                  className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Essai gratuit
                </button>
              </>
            )}
          </div>

          <div className="mt-3">
            <button
              onClick={() => { setMobileOpen(false); router.push("/assistant"); }}
              className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Assistant IA
            </button>
          </div>
        </div>
      )}

    </header>
    <div className="fixed inset-x-4 bottom-4 z-[60] flex justify-center lg:hidden">
      <button
        onClick={() => router.push("/abonnement")}
        className="w-full max-w-xs rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-orange-200"
      >
        Essai gratuit
      </button>
    </div>
    </Fragment>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CreditCard, LogOut, Package, Eye,
  Send, Store, Sparkles, Settings, ClipboardList,
  LayoutDashboard, Building2, Users, FileText, Home
} from "lucide-react";
import { signOut } from "next-auth/react";

type Catalog = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

type MenuItem = {
  label: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badgeKey?: "demandes" | "offres";
};

interface SidebarProps {
  onSectionChange?: (section: string) => void;
  activeSection?: string;
  onCatalogSelect?: (catalogId: string | null) => void;
  selectedCatalogId?: string | null;
}

export default function Sidebar({
  onSectionChange,
  activeSection,
  onCatalogSelect,
  selectedCatalogId,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(true);
  const [badges, setBadges] = useState<{ demandes: boolean; offres: boolean }>({ demandes: false, offres: false });

  const roleMenuMap: Record<string, MenuItem[]> = {
    artisan: [
      { label: "Tableau de bord", section: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Catalogue", section: "catalogue", icon: Package, href: "/artisan/catalogue" },
      { label: "Projets", section: "projets", icon: Eye, href: "/artisan/projets" },
      { label: "Demandes de devis", section: "demandes", icon: ClipboardList, href: "/artisan/demandes", badgeKey: "demandes" },
      { label: "Offres reçues", section: "offres", icon: Send, href: "/artisan/offres", badgeKey: "offres" },
      { label: "Portfolio", section: "portfolio", icon: Store, href: "/artisan/portfolio" },
      { label: "Partenaires", section: "partenaires", icon: Home, href: "/partenaires" },
      { label: "Paramètres", section: "parametres", icon: Settings, href: "/parametres" },
    ],
    vendeur: [
      { label: "Tableau de bord", section: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Catalogue", section: "catalogue", icon: Package, href: "/vendeur?section=catalogue" },
      { label: "Projets disponibles", section: "projets-disponibles", icon: Eye, href: "/vendeur/projets" },
      { label: "Demandes de devis", section: "demandes", icon: ClipboardList, href: "/vendeur/demandes" },
      { label: "Offres envoyées", section: "offres-envoyees", icon: Send, href: "/vendeur?section=offres" },
      { label: "Annonces", section: "annonces", icon: Store, href: "/vendeur?section=annonces" },
      { label: "Assistant IA", section: "ia", icon: Sparkles, href: "/vendeur?section=ia" },
      { label: "Partenaires", section: "partenaires", icon: Home, href: "/partenaires" },
      { label: "Paramètres", section: "parametres", icon: Settings, href: "/parametres" },
    ],
    promoteur: [
      { label: "Tableau de bord", section: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Programmes", section: "programmes", icon: Building2, href: "/promoteur/programmes" },
      { label: "Lots suivis", section: "lots", icon: FileText, href: "/promoteur/lots" },
      { label: "Entreprises actives", section: "entreprises", icon: Users, href: "/promoteur/entreprises" },
      { label: "Partenaires", section: "partenaires", icon: Home, href: "/partenaires" },
      { label: "Paramètres", section: "parametres", icon: Settings, href: "/parametres" },
    ],
  };

  const menus = roleMenuMap[session?.user?.role ?? "artisan"] ?? roleMenuMap.artisan;

  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!session?.user?.id || session.user.role !== "vendeur") return;
      setCatalogsLoading(true);
      try {
        const res = await fetch("/api/seller/catalogs", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCatalogs(Array.isArray(data) ? data : []);
        }
      } catch {
        console.error("Erreur chargement catalogues");
      } finally {
        setCatalogsLoading(false);
      }
    };

    void fetchCatalogs();
  }, [session]);

  // ============================================================
  // BADGES DE NOTIFICATIONS (pour l'artisan)
  // ============================================================
  const isArtisan = session?.user?.role === "artisan" || session?.user?.trade === "artisan";

  useEffect(() => {
    if (!isArtisan) return;

    const fetchBadges = async () => {
      try {
        const res = await fetch("/api/artisan/notifications-badges", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setBadges({ demandes: !!data.demandes, offres: !!data.offres });
        }
      } catch {
        // silencieux
      }
    };

    void fetchBadges();
    const interval = window.setInterval(fetchBadges, 30000);
    return () => window.clearInterval(interval);
  }, [isArtisan, pathname]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleMenuClick = (item: MenuItem) => {
    if (item.section === "catalogue") {
      setCatalogMenuOpen(true);
      if (onCatalogSelect) onCatalogSelect(null);
    }

    if (item.href) {
      router.push(item.href);
      return;
    }

    if (onSectionChange) {
      onSectionChange(item.section);
    }
  };

  const handleCatalogClick = (catalogId: string) => {
    if (onCatalogSelect) onCatalogSelect(catalogId);
    if (onSectionChange) onSectionChange("catalogue");

    const params = new URLSearchParams(window.location.search);
    params.set("section", "catalogue");
    params.set("catalog", catalogId);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);

    if (pathname !== "/vendeur") {
      router.push(`/vendeur?${params.toString()}`);
    }

    setCatalogMenuOpen(true);
  };

  // ============================================================
  // RENDU
  // ============================================================
  if (!session) return null;

  const isVendeur = session?.user?.role === "vendeur";

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 px-3 pt-24 pb-4 overflow-y-auto">
        <ul className="space-y-1">
          {menus.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.section || pathname === item.href;

            if (item.section === "catalogue" && isVendeur) {
              return (
                <li key={`${item.section}-${index}`}>
                  <button onClick={() => handleMenuClick(item)} className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition text-sm font-medium text-left ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                  {catalogMenuOpen && (
                    <div className="ml-6 mt-1 border-l border-gray-200 pl-3 max-h-72 overflow-y-auto pr-1">
                      <div className="space-y-1">
                        {catalogsLoading ? (
                          <div className="text-xs text-gray-400 py-1">Chargement...</div>
                        ) : catalogs.length === 0 ? (
                          <div className="text-xs text-gray-400 py-1">Aucun catalogue</div>
                        ) : (
                          catalogs.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => handleCatalogClick(cat.id)}
                              className={`flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md transition text-xs text-left ${selectedCatalogId === cat.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                            >
                              <span className="truncate max-w-[120px]">{cat.name}</span>
                              <span className="text-[10px] text-gray-400 shrink-0">{cat.productCount}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            }

            return (
              <li key={`${item.section}-${index}`}>
                <button onClick={() => handleMenuClick(item)} className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition text-sm font-medium text-left ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                  <span className="relative">
                    <Icon className="w-5 h-5" />
                    {item.badgeKey && badges[item.badgeKey] && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                  </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-100 p-4 space-y-3">
        <a
          href="/abonnement"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <CreditCard className="w-5 h-5" />
          Abonnements
        </a>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
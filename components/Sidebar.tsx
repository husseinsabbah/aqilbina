"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Home, Users, CreditCard, LogOut,
  ChevronDown, Package, Eye, Send, Store, FileText, Sparkles, Settings, PlusCircle
} from "lucide-react";
import { signOut } from "next-auth/react";




type Agent = {
  id: string;
  name: string;
  type: string;
  category: string | null;
};

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
  href?: string;
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
  selectedCatalogId
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(true);

  // Charger les catalogues du vendeur
  const fetchCatalogs = async () => {
    if (!session?.user?.id) return;
    setCatalogsLoading(true);
    try {
      const res = await fetch("/api/seller/catalogs", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCatalogs(data);
      }
    } catch (error) {
      console.error("Erreur chargement catalogues:", error);
    } finally {
      setCatalogsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAgents = async () => {
      if (!session) return;
      try {
        const res = await fetch("/api/user/agents", { credentials: "include" });
        if (!res.ok) {
          setAgents([]);
          setCurrentAgent(null);
          return;
        }

        const data = await res.json();
        setAgents(data || []);
        if ((data || []).length > 0) {
          const selectedId = new URLSearchParams(window.location.search).get("agent");
          const found = data.find((a: Agent) => a.id === selectedId) || data[0];
          setCurrentAgent(found);
        } else {
          setCurrentAgent(null);
        }
      } catch (error) {
        setAgents([]);
        setCurrentAgent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
    
    // Charger les catalogues si l'utilisateur est un vendeur
    if (session?.user?.role === "vendeur") {
      fetchCatalogs();
    }
  }, [session]);

  const switchAgent = (agent: Agent) => {
    setCurrentAgent(agent);
    setDropdownOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.set("agent", agent.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const getMenus = (): MenuItem[] => {
    if (!currentAgent) return [];
    if (currentAgent.type === "artisan") {
      return [
        { label: "Catalogue", section: "catalogue", icon: Package, href: "/artisan/catalogue" },
        { label: "Projets", section: "projets", icon: Eye, href: "/artisan/projets" },
        { label: "Offres reçues", section: "offres", icon: Send, href: "/artisan/offres" },
        { label: "Paramètres", section: "parametres", icon: Settings, href: "/artisan/parametres" },
      ];
    } else if (currentAgent.type === "vendeur") {
      return [
        { label: "Dashboard", section: "dashboard", icon: LayoutDashboard },
        { label: "Catalogue", section: "catalogue", icon: Package },
        { label: "Projets disponibles", section: "projets", icon: Eye },
        { label: "Offres envoyées", section: "offres", icon: Send },
        { label: "Annonces", section: "annonces", icon: Store },
        { label: "Assistant IA", section: "ia", icon: Sparkles },
      ];
    }
    return [];
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.section === "catalogue") {
      setCatalogMenuOpen(true);
      if (onCatalogSelect) onCatalogSelect(null);
    }
    if (item.section === "dashboard") {
      if (onCatalogSelect) onCatalogSelect(null);
    }
    if (onSectionChange && pathname.startsWith("/vendeur")) {
      onSectionChange(item.section);
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const handleCatalogClick = (catalogId: string) => {
    if (onCatalogSelect) {
      onCatalogSelect(catalogId);
    }
    if (onSectionChange) {
      onSectionChange("catalogue");
    }
    setCatalogMenuOpen(true);
    setDropdownOpen(false);
  };

  if (loading || !session) return null;

  const isVendeur = session?.user?.role === "vendeur";

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <LayoutDashboard className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-bold text-gray-800">Aqil Bina</span>
      </div>

      {agents.length > 1 && (
        <div className="px-3 py-3 border-b border-gray-100 relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <span className="text-sm font-medium truncate">
              {currentAgent?.name || "Sélectionner un agent"}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => switchAgent(agent)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    currentAgent?.id === agent.id ? "bg-blue-50 text-blue-700 font-medium" : ""
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {agent.name}
                </button>
              ))}
              <button
                onClick={() => {
                  setCurrentAgent(null);
                  setDropdownOpen(false);
                  router.push("/dashboard?view=overview");
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-t border-gray-100 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-purple-600" />
                Vue d’ensemble
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {currentAgent ? (
          <ul className="space-y-1">
            {getMenus().map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.section;

              if (item.section === "catalogue" && isVendeur) {
                return (
                  <li key={`${item.section}-${index}`}>
                    <button
                      onClick={() => handleMenuClick(item)}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition text-sm font-medium text-left ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>

                    {catalogMenuOpen && (
                      <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-3">
                        {catalogsLoading ? (
                          <div className="text-xs text-gray-400 py-1">Chargement...</div>
                        ) : catalogs.length === 0 ? (
                          <div className="text-xs text-gray-400 py-1">Aucun catalogue</div>
                        ) : (
                          catalogs.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => handleCatalogClick(cat.id)}
                              className={`flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md transition text-sm text-left ${
                                selectedCatalogId === cat.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                            >
                              <span className="truncate">{cat.name}</span>
                              <span className="text-[10px] text-gray-400">{cat.productCount}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li key={`${item.section}-${index}`}>
                  <button
                    onClick={() => handleMenuClick(item)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition text-sm font-medium text-left ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-gray-500 text-sm mt-4">
            Sélectionnez un agent
          </div>
        )}
      </nav>

      <div className="border-t border-gray-100 p-4 space-y-2">
        {isVendeur && (
          <>
            <a
              href="/parametres"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <Settings className="w-5 h-5" />
              Paramètres
            </a>
            <button
              onClick={() => router.push("/abonnement")}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
            >
              <PlusCircle className="w-5 h-5" />
              Acheter un nouvel agent
            </button>
          </>
        )}
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
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  Settings,
  LogOut,
  Store,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!session) {
      router.push("/login");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        ⏳ Chargement de votre session...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentRole = (session.user.role || session.user.trade || "artisan").toLowerCase();
  const profileType = currentRole.includes("vendeur") ? "vendeur" : currentRole.includes("promoteur") ? "promoteur" : "artisan";

  const staticMenuByProfile: Record<string, Array<{ name: string; href: string; icon: typeof LayoutDashboard }>> = {
    artisan: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { name: "Catalogue", href: "/artisan/catalogue", icon: Package },
      { name: "Projets", href: "/artisan/projets", icon: FolderKanban },
      { name: "Demandes de devis", href: "/artisan/demandes", icon: Package },
      { name: "Offres reçues", href: "/artisan/offres", icon: Package },
      { name: "Portfolio", href: "/artisan/portfolio", icon: Store },
      { name: "Partenaires", href: "/partenaires", icon: Store },
      { name: "Paramètres", href: "/parametres", icon: Settings },
    ],
    vendeur: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { name: "Catalogue", href: "/vendeur?section=catalogue", icon: Package },
      { name: "Projets disponibles", href: "/vendeur/projets", icon: FolderKanban },
      { name: "Demandes de devis", href: "/vendeur/demandes", icon: FolderKanban },
      { name: "Offres envoyées", href: "/vendeur?section=offres", icon: Store },
      { name: "Annonces", href: "/vendeur?section=annonces", icon: Store },
      { name: "Assistant IA", href: "/vendeur?section=ia", icon: Store },
      { name: "Partenaires", href: "/partenaires", icon: Store },
      { name: "Paramètres", href: "/parametres", icon: Settings },
    ],
    promoteur: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { name: "Programmes", href: "/promoteur/programmes", icon: FolderKanban },
      { name: "Lots suivis", href: "/promoteur/lots", icon: Package },
      { name: "Entreprises actives", href: "/promoteur/entreprises", icon: Store },
      { name: "Partenaires", href: "/partenaires", icon: Store },
      { name: "Paramètres", href: "/parametres", icon: Settings },
    ],
  };

  const navItems = staticMenuByProfile[profileType] ?? staticMenuByProfile.artisan;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <nav aria-label="Menu principal" className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-50">{children}</main>
    </div>
  );
}
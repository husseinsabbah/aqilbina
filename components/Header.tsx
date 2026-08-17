"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useEffect } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user;
  const displayName = user?.companyName || user?.name || "Artisan";
  const isAuthenticated = status === "authenticated";

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: "/", 
      redirect: true 
    });
    // Force le rechargement de la page pour vider le cache
    window.location.href = "/";
  };

  // Optionnel : si la session change, on peut forcer un re-rendu
  useEffect(() => {
    // Rien de spécial, le composant se mettra à jour via useSession
  }, [session]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-600 cursor-pointer" onClick={() => router.push("/")}>
            🏗️ Aqil Bina
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Bonjour, {displayName}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/auth/signin")}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Connexion
              </button>
              <button
                onClick={() => router.push("/abonnement")}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Devenir pro
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
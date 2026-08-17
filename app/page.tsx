// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Shield, Users, Zap, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/public/search-artisan?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          router.push(`/client/${data.id}`);
        } else {
          alert("Aucun artisan trouvé avec ce nom.");
        }
      } else {
        alert("Erreur lors de la recherche.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur réseau.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* LE HEADER A ÉTÉ SUPPRIMÉ – IL EST DÉJÀ DANS layout.tsx */}

      {/* ===== HERO ===== */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-extrabold text-gray-900 leading-tight">
            L'IA qui construit votre projet <span className="text-blue-600">de A à Z</span>
          </h2>
          <p className="text-xl text-gray-600 mt-4">
            Trouvez les matériaux, les prestations et les experts pour vos projets de construction.
          </p>

          <form onSubmit={handleSearch} className="mt-8 max-w-lg mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Entrez le nom de votre artisan (ex: Hassan)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              {isSearching ? "Recherche..." : "Trouver"}
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-gray-500">
            <span>ou</span>
            <button onClick={() => router.push('/artisans')} className="text-blue-600 hover:underline font-medium">
              voir la liste complète des artisans →
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => router.push('/artisans')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 justify-center text-lg"
            >
              <Search className="w-5 h-5" /> Trouver mon artisan
            </button>
            <button
              onClick={() => router.push('/abonnement')}
              className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 justify-center text-lg"
            >
              Devenir pro
            </button>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Pourquoi Aqil Bina ?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-xl font-semibold">Artisans vérifiés</h4>
            <p className="text-gray-600">Tous nos artisans sont certifiés et notés par leurs clients.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-xl font-semibold">Devis en 24h</h4>
            <p className="text-gray-600">Recevez des devis clairs et détaillés sous 24 heures.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="text-xl font-semibold">Écosystème complet</h4>
            <p className="text-gray-600">Catalogue, offres, paiements : tout est centralisé.</p>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-16 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h3 className="text-3xl font-bold">Prêt à rejoindre l'aventure ?</h3>
          <p className="text-gray-300 mt-2">
            Que vous soyez artisan ou vendeur, créez votre compte et développez votre activité.
          </p>
          <button
            onClick={() => router.push('/abonnement')}
            className="mt-6 bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto transition"
          >
            Voir les offres <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-gray-500 text-sm">
        © 2026 Aqil Bina. Tous droits réservés.
      </footer>
    </div>
  );
}
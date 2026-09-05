"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";

type SearchType = "all" | "artisan" | "vendeur" | "promoteur";

export default function SearchBar() {
  const router = useRouter();
  const [type, setType] = useState<SearchType>("all");
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === "all" && !query.trim()) {
      router.push("/devis/nouveau");
      return;
    }

    if (type !== "all" && !query.trim()) {
      router.push(`/recherche?type=${type}`);
      return;
    }

    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (query.trim()) params.set("q", query.trim());
    router.push(`/recherche?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="flex w-full overflow-hidden rounded-full border border-slate-200 bg-white shadow-md shadow-slate-200/60 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
    >
      {/* Dropdown */}
      <div className="relative flex-shrink-0">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SearchType)}
          className="h-full appearance-none bg-transparent px-4 py-3 pr-8 text-sm font-medium text-slate-700 outline-none"
        >
          <option value="all">🔍 Tous</option>
          <option value="artisan">🏗️ Artisan</option>
          <option value="vendeur">📦 Vendeur</option>
          <option value="promoteur">🏢 Promoteur</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      {/* Séparateur */}
      <div className="h-8 w-px bg-slate-200" />

      {/* Champ texte */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrer par nom, ville ou spécialité..."
        className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
        aria-label="Rechercher un professionnel"
      />

      {/* Bouton de recherche */}
      <button
        type="submit"
        className="flex-shrink-0 bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 transition-colors"
        aria-label="Lancer la recherche"
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}
"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Check, X, Loader2 } from "lucide-react";

type Suggestion = {
  area: string;
  label: string;
  surface: number;
  unit: string;
  recommendedProducts: {
    id: string;
    name: string;
    price: number;
    stock: number;
    imageUrl?: string;
  }[];
};

export default function SelectorTab({ projectId }: { projectId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string[]>>({});

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/selector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setGenerated(true);
    } catch (error) {
      console.error("Erreur génération suggestions :", error);
      alert("Erreur lors de la génération des suggestions");
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (suggestionIndex: number, productId: string) => {
    const key = `${suggestionIndex}`;
    const current = selectedProducts[key] || [];
    if (current.includes(productId)) {
      setSelectedProducts({
        ...selectedProducts,
        [key]: current.filter(id => id !== productId),
      });
    } else {
      setSelectedProducts({
        ...selectedProducts,
        [key]: [...current, productId],
      });
    }
  };

  const addSelectedToProject = async () => {
    // Pour chaque suggestion, récupérer les produits sélectionnés
    const allSelected: string[] = [];
    Object.values(selectedProducts).forEach(ids => allSelected.push(...ids));
    if (allSelected.length === 0) {
      alert("Veuillez sélectionner au moins un produit.");
      return;
    }
    // Ici, on pourrait appeler une API pour ajouter les produits au projet
    // Pour l'instant, on affiche un message
    alert(`✅ ${allSelected.length} produit(s) sélectionnés. (Fonctionnalité d'ajout en développement)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">🛒 Sélecteur IA</h2>
        <button
          onClick={generateSuggestions}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
          {loading ? "Analyse..." : "Proposer des produits"}
        </button>
      </div>

      {!generated && !loading && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
          <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p>Cliquez sur "Proposer des produits" pour que l'IA analyse votre projet</p>
          <p className="text-sm">Elle sélectionnera les produits adaptés depuis votre catalogue.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600" />
          <p className="mt-2 text-gray-500">Analyse du projet et recherche de produits...</p>
        </div>
      )}

      {generated && !loading && (
        <>
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              <p>Aucun produit suggéré.</p>
              <p className="text-sm">Vérifiez votre catalogue ou les données du projet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-800">
                    {suggestion.label} ({suggestion.surface.toFixed(1)} {suggestion.unit})
                  </h3>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestion.recommendedProducts.map((product) => {
                      const isSelected = (selectedProducts[`${index}`] || []).includes(product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                            isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleProductSelection(index, product.id)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.price} €</p>
                          </div>
                          {isSelected ? (
                            <Check className="w-5 h-5 text-purple-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={addSelectedToProject}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                Ajouter les produits sélectionnés au devis
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Lightbulb } from "lucide-react";

type Suggestion = {
  type: "warning" | "info" | "suggestion" | "alternative";
  title: string;
  description: string;
  action?: string;
  missingItems?: any[];
  serviceId?: string;
};

type ProjectItem = {
  id: string;
  quantity: number;
  unitPriceHtAtSale: number;
  tvaRate: number;
  product?: { name: string; salePrice: number };
  service?: { name: string; unitPriceHt: number };
  customLabel?: string;
  customPrice?: number;
};

type SuggestionsIAProps = {
  projectId: string;
  onAddItem: (item: any) => void;
  existingItems: ProjectItem[];
};

// ============================================================
// NORMALISATION DU NOM (supprime les parenthèses et unités)
// ============================================================
function normalizeName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '')           // Supprime (13 m²), (25 kg), etc.
    .replace(/\d+\.?\d*\s*(m²|kg|L|cm|mm|unite?)/gi, '') // Supprime les unités
    .trim()
    .toLowerCase();
}

export default function SuggestionsIA({ projectId, onAddItem, existingItems }: SuggestionsIAProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  // Construction de la liste des clés existantes (noms normalisés)
  const existingKeys = new Set(
    existingItems.map(item => {
      const rawName = item.customLabel || item.product?.name || item.service?.name || "";
      return normalizeName(rawName);
    }).filter(Boolean)
  );

  useEffect(() => {
    console.log('🔍 SuggestionsIA monté, projectId =', projectId);
    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/assistant/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json();
        setSuggestions(data.advice || []);
      } catch (error) {
        console.error("Erreur suggestions :", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [projectId]);

  // Ajout automatique des suggestions (avec vérification des doublons par nom normalisé)
  useEffect(() => {
    if (loading || suggestions.length === 0) return;

    suggestions.forEach((suggestion) => {
      // Produits manquants
      if (suggestion.type === "warning" && suggestion.missingItems) {
        suggestion.missingItems.forEach((item) => {
          const key = normalizeName(item.name);
          if (!existingKeys.has(key) && !addedKeys.has(key)) {
            onAddItem({
              customLabel: item.name, // Nom pur (sans quantité)
              customPrice: item.estimatedPrice || 0,
              quantity: item.quantity || 1, // Quantité séparée
            });
            setAddedKeys(prev => new Set(prev).add(key));
          }
        });
      }

      // Prestations de pose
      if (suggestion.title?.includes('Pose sol') || suggestion.title?.includes('Pose mur')) {
        const key = normalizeName(suggestion.title);
        if (!existingKeys.has(key) && !addedKeys.has(key)) {
          const match = suggestion.description.match(/(\d+\.?\d*)\s*€/);
          const price = match ? parseFloat(match[1]) : 0;
          onAddItem({
            customLabel: suggestion.title,
            customPrice: price,
            quantity: 1,
          });
          setAddedKeys(prev => new Set(prev).add(key));
        }
      }
    });
  }, [suggestions, loading, onAddItem, existingKeys, addedKeys]);

  if (loading) {
    return <div className="text-sm text-gray-500">⏳ Analyse du projet en cours...</div>;
  }

  if (suggestions.length === 0) {
    return <div className="text-sm text-gray-500">✅ Aucune suggestion pour le moment.</div>;
  }

  // Filtrer les suggestions déjà ajoutées
  const remainingSuggestions = suggestions.filter(s => {
    if (s.type === "warning" && s.missingItems) {
      return s.missingItems.some(item => !existingKeys.has(normalizeName(item.name)) && !addedKeys.has(normalizeName(item.name)));
    }
    if (s.title?.includes('Pose sol') || s.title?.includes('Pose mur')) {
      return !existingKeys.has(normalizeName(s.title)) && !addedKeys.has(normalizeName(s.title));
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {remainingSuggestions.map((suggestion, index) => {
        if (suggestion.type === "warning" && suggestion.missingItems) {
          const remainingItems = suggestion.missingItems.filter(
            item => !existingKeys.has(normalizeName(item.name)) && !addedKeys.has(normalizeName(item.name))
          );
          if (remainingItems.length === 0) return null;

          return (
            <div key={index}>
              <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {suggestion.title}
              </p>
              <div className="mt-2 space-y-2">
                {remainingItems.map((item, idx) => {
                  const price = item.estimatedPrice || 0;
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                      <span className="text-sm flex-1">
                        {item.name} → <strong>{price} €</strong> (x{item.quantity} {item.unit})
                      </span>
                      <span className="text-xs text-green-600">✅ Ajouté automatiquement</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (suggestion.title?.includes('Pose sol') || suggestion.title?.includes('Pose mur')) {
          if (existingKeys.has(normalizeName(suggestion.title)) || addedKeys.has(normalizeName(suggestion.title))) return null;
          return (
            <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">{suggestion.description}</p>
              <span className="text-xs text-green-600">✅ Ajouté automatiquement</span>
            </div>
          );
        }

        return (
          <div key={index} className="text-sm text-gray-700">
            <span className="font-medium">{suggestion.title}</span> : {suggestion.description}
          </div>
        );
      })}
    </div>
  );
}
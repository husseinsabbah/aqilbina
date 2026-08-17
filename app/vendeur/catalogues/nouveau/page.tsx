"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const METIERS = [
  "Carrelage",
  "Plomberie",
  "Électricité",
  "Peinture",
  "Menuiserie",
  "Maçonnerie",
  "Couvreur",
  "Isolation",
  "Climatisation",
  "Chauffage",
  "Ventilation",
  "Étanchéité",
  "Ferronnerie",
  "Serrurerie",
  "Vitrerie",
  "Autre",
];

export default function NouveauCataloguePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isOther: false,
    otherName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.isOther ? formData.otherName.trim() : formData.name;
    if (!name) {
      alert("Veuillez saisir un nom de catalogue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/seller/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          description: formData.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Erreur : " + (err.error || "Impossible de créer le catalogue"));
        return;
      }

      window.dispatchEvent(new CustomEvent("seller-catalogs:refresh"));
      router.push("/vendeur?catalog=created");
      router.refresh();
    } catch (error) {
      console.error("Erreur création catalogue:", error);
      alert("Erreur serveur. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 pl-64">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">📂 Créer un nouveau catalogue</h1>
            <p className="text-gray-500 text-sm mb-6">
              Un catalogue regroupe vos produits par catégorie (ex: Carrelage, Plomberie, Électricité...).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du catalogue *
                </label>
                {!formData.isOther ? (
                  <select
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionnez un métier...</option>
                    {METIERS.map((metier) => (
                      <option key={metier} value={metier}>
                        {metier}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ex: Ébénisterie, Ferronnerie d'art..."
                    value={formData.otherName}
                    onChange={(e) => setFormData({ ...formData, otherName: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required={formData.isOther}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isOther: !formData.isOther, name: "", otherName: "" })}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  {formData.isOther ? "Choisir dans la liste" : "Saisir un autre métier"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnelle)
                </label>
                <textarea
                  placeholder="Décrivez brièvement ce catalogue..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {loading ? "Création en cours..." : "Créer le catalogue"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
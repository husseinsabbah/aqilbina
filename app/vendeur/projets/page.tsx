"use client";

import { useState, useEffect } from "react";
import { Send, Eye, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Product = {
  id: string;
  name: string;
  salePrice: number;
};

type AvailableProject = {
  id: string;
  name: string;
  type: string | null;
  surface: number | null;
  budgetEstimate: number | null;
  clientName: string;
  items: { name: string; quantity: number }[];
  createdAt: string;
};

export default function VendeurProjetsPage() {
  const router = useRouter();
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour le formulaire d'offre
  const [offerProjectId, setOfferProjectId] = useState("");
  const [offerProductId, setOfferProductId] = useState("");
  const [offerQuantity, setOfferQuantity] = useState("1");
  const [offerUnitPrice, setOfferUnitPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);

  const fetchAvailableProjects = async () => {
    try {
      const res = await fetch('/api/vendor/projects', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAvailableProjects(data);
      }
    } catch (error) {
      console.error("Erreur chargement projets :", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/seller/products', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Erreur chargement produits :", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchAvailableProjects();
      await fetchProducts();
      setLoading(false);
    };
    load();
  }, []);

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantityNum = parseFloat(offerQuantity);
    const unitPriceNum = parseFloat(offerUnitPrice);

    if (!offerProjectId || !offerProductId) {
      alert("Veuillez sélectionner un projet et un produit.");
      return;
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert("Veuillez entrer une quantité valide (nombre > 0).");
      return;
    }

    if (isNaN(unitPriceNum) || unitPriceNum < 0) {
      alert("Veuillez entrer un prix unitaire valide.");
      return;
    }

    setSendingOffer(true);
    try {
      const res = await fetch('/api/seller/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: offerProjectId,
          productId: offerProductId,
          quantity: quantityNum,
          unitPrice: unitPriceNum,
          message: offerMessage || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      const data = await res.json();
      alert(`✅ Offre envoyée avec succès ! (ID: ${data.id})`);
      setOfferProjectId("");
      setOfferProductId("");
      setOfferQuantity("1");
      setOfferUnitPrice("");
      setOfferMessage("");
      await fetchAvailableProjects();
    } catch (error) {
      console.error("Erreur envoi offre :", error);
      alert("Erreur : " + (error as Error).message);
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 pl-64">
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">🛒 Marché des projets</h1>

          {loading ? (
            <p className="text-gray-500">Chargement...</p>
          ) : availableProjects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
              <p>Aucun projet disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableProjects.map((project) => (
                <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                  <h3 className="text-lg font-semibold text-gray-800">{project.name}</h3>
                  <p className="text-sm text-gray-600">Client : {project.clientName}</p>
                  <p className="text-sm text-gray-600">Type : {project.type || 'Non spécifié'} {project.surface ? `- ${project.surface} m²` : ''}</p>
                  <p className="text-sm text-gray-600">Budget : {project.budgetEstimate ? `${project.budgetEstimate} €` : 'Non défini'}</p>
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-500">Produits demandés :</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside">
                      {project.items.length > 0 ? project.items.map((item, idx) => (
                        <li key={idx}>{item.name} (x{item.quantity})</li>
                      )) : <li>Aucun produit spécifié</li>}
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setOfferProjectId(project.id);
                      document.getElementById('offer-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Faire une offre
                  </button>
                </div>
              ))}
            </div>
          )}

          <div id="offer-form" className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" /> Faire une offre sur un projet
            </h2>
            <form onSubmit={handleSendOffer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID du projet *</label>
                <input
                  type="text"
                  placeholder="ex: cmsp0t1rp000elmiggnhdlyz9"
                  value={offerProjectId}
                  onChange={(e) => setOfferProjectId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
            <select
              value={offerProductId}
              onChange={(e) => setOfferProductId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner un produit...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} - {p.salePrice} €</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={offerQuantity}
              onChange={(e) => setOfferQuantity(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire (€) *</label>
            <input
              type="number"
              step="0.01"
              placeholder="ex: 42.50"
              value={offerUnitPrice}
              onChange={(e) => setOfferUnitPrice(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
            <input
              type="text"
              placeholder="Message pour l'artisan"
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={sendingOffer}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sendingOffer ? 'Envoi en cours...' : 'Envoyer l\'offre'}
            </button>
          </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
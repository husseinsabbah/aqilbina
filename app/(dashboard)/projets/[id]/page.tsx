"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PDFDownloadLink } from '@react-pdf/renderer';
import DevisPDF from './DevisPDF';
import AssistantTab from './AssistantTab';
import SelectorTab from './SelectorTab';

type Project = {
  id: string;
  name: string;
  status: string;
  budgetEstimate: number | null;
  description: string | null;
};

type ProjectItem = {
  id: string;
  quantity: number;
  unitPriceHtAtSale: number;
  tvaRate: number;
  product?: { name: string; salePrice: number };
  service?: { name: string; unitPriceHt: number };
};

export default function ProjetEditorPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"devis" | "assistant" | "selector">("devis");

  const [addType, setAddType] = useState<"product" | "service">("product");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Erreur chargement projet");
      const data = await res.json();
      setProject(data);
    } catch (error) {
      console.error("Erreur chargement projet :", error);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/items`, { credentials: 'include' });
      if (!res.ok) throw new Error("Erreur chargement items");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Erreur chargement items :", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products", { credentials: 'include' });
      if (!res.ok) throw new Error("Erreur chargement produits");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erreur chargement produits :", error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services", { credentials: 'include' });
      if (!res.ok) throw new Error("Erreur chargement services");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Erreur chargement services :", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchProject();
      await fetchItems();
      await fetchProducts();
      await fetchServices();
      setLoading(false);
    };
    load();
  }, [projectId]);

  const addItem = async () => {
    if (addType === "product" && (!selectedProductId || quantity <= 0)) {
      alert("Veuillez sélectionner un produit et une quantité valide");
      return;
    }
    if (addType === "service" && (!selectedServiceId || quantity <= 0)) {
      alert("Veuillez sélectionner une prestation et une quantité valide");
      return;
    }

    try {
      const body = addType === "product"
        ? { productId: selectedProductId, quantity }
        : { serviceId: selectedServiceId, quantity };

      const res = await fetch(`/api/projects/${projectId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Erreur : " + (err.error || "Impossible d'ajouter"));
        return;
      }

      await fetchItems();
      setShowAddModal(false);
      setSelectedProductId("");
      setSelectedServiceId("");
      setQuantity(1);
      setAddType("product");
    } catch (error) {
      console.error("Erreur ajout item :", error);
      alert("Erreur lors de l'ajout");
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Supprimer cette ligne ?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/items/${itemId}`, {
        method: "DELETE",
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Erreur suppression");
      await fetchItems();
    } catch (error) {
      console.error("Erreur suppression :", error);
    }
  };

  const totalHT = items.reduce((sum, item) => sum + item.unitPriceHtAtSale * item.quantity, 0);
  const totalTVA = items.reduce((sum, item) => sum + (item.unitPriceHtAtSale * item.quantity * item.tvaRate / 100), 0);
  const totalTTC = totalHT + totalTVA;

  if (loading) return <div className="p-8 text-center text-gray-500">⏳ Chargement...</div>;
  if (!project) return <div className="p-8 text-center text-red-500">❌ Projet introuvable</div>;

  const pdfItems = items.map((item) => ({
    name: item.product?.name || item.service?.name || "—",
    quantity: item.quantity,
    price: item.unitPriceHtAtSale,
    tvaRate: item.tvaRate,
    total: item.unitPriceHtAtSale * item.quantity,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-sm text-gray-500">Statut : {project.status}</p>
        </div>
        <div className="flex gap-2">
          <PDFDownloadLink
            document={
              <DevisPDF
                projectName={project.name}
                projectStatus={project.status}
                items={pdfItems}
                totalHT={totalHT}
                totalTVA={totalTVA}
                totalTTC={totalTTC}
              />
            }
            fileName={`devis_${project.name}.pdf`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            {({ loading }) => (loading ? '⏳ Génération...' : '📄 Télécharger PDF')}
          </PDFDownloadLink>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("devis")}
          className={`pb-2 px-1 text-sm font-medium transition ${
            activeTab === "devis"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📋 Devis
        </button>
        <button
          onClick={() => setActiveTab("assistant")}
          className={`pb-2 px-1 text-sm font-medium transition ${
            activeTab === "assistant"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🤖 Assistant IA
        </button>
        <button
          onClick={() => setActiveTab("selector")}
          className={`pb-2 px-1 text-sm font-medium transition ${
            activeTab === "selector"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🛒 Sélecteur IA
        </button>
      </div>

      {/* Contenu */}
      {activeTab === "devis" && (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Qté</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prix HT</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">TVA</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total HT</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Aucun produit ou prestation ajouté
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const name = item.product?.name || item.service?.name || "—";
                      const price = item.unitPriceHtAtSale;
                      const total = price * item.quantity;
                      return (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="px-6 py-4 text-sm">{name}</td>
                          <td className="px-6 py-4 text-sm">{item.quantity}</td>
                          <td className="px-6 py-4 text-sm">{price.toFixed(2)} €</td>
                          <td className="px-6 py-4 text-sm">{item.tvaRate}%</td>
                          <td className="px-6 py-4 text-sm font-medium">{total.toFixed(2)} €</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-6 border-t border-gray-200 pt-6">
              <div>
                <span className="text-gray-500">Total HT :</span>{" "}
                <span className="font-bold">{totalHT.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-gray-500">TVA :</span>{" "}
                <span className="font-bold">{totalTVA.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-gray-500">Total TTC :</span>{" "}
                <span className="font-bold text-xl text-blue-600">
                  {totalTTC.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>

          {/* Modal d'ajout */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
                <h2 className="text-xl font-bold mb-4">Ajouter un élément</h2>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddType("product")}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        addType === "product"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Produit
                    </button>
                    <button
                      onClick={() => setAddType("service")}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        addType === "service"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Prestation
                    </button>
                  </div>

                  {addType === "product" ? (
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choisir un produit...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {p.salePrice} € TTC
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choisir une prestation...</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {s.unitPriceHt} € HT / {s.unit}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="number"
                    placeholder="Quantité"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    onClick={addItem}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "assistant" && (
        <AssistantTab projectId={projectId} />
      )}

      {activeTab === "selector" && (
        <SelectorTab projectId={projectId} />
      )}
    </div>
  );
}
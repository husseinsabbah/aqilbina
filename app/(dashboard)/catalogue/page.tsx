"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Upload } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  tvaRate: number;
  imageUrl: string | null;
};

type Service = {
  id: string;
  name: string;
  unit: string;
  unitPriceHt: number;
  tvaRate: number;
};

export default function CataloguePage() {
  // ============ ÉTATS PRODUITS ============
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    purchasePrice: "",
    salePrice: "",
    stock: "",
    tvaRate: "20",
    imageUrl: "",
  });

  // ============ ÉTATS SERVICES ============
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    unit: "",
    unitPriceHt: "",
    tvaRate: "20",
  });

  // ============ ÉTATS IMPORTATION ============
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // ============ FONCTIONS PRODUITS ============
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products', { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erreur :", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          purchasePrice: parseFloat(formData.purchasePrice),
          salePrice: parseFloat(formData.salePrice),
          stock: parseInt(formData.stock) || 0,
          tvaRate: parseFloat(formData.tvaRate) || 20,
          imageUrl: formData.imageUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Erreur : ' + err.error);
        return;
      }

      await fetchProducts();
      setShowModal(false);
      setFormData({ name: "", description: "", category: "", purchasePrice: "", salePrice: "", stock: "", tvaRate: "20", imageUrl: "" });
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de l'ajout du produit");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ============ FONCTIONS SERVICES ============
  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services', { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur chargement services');
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Erreur chargement services :", error);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: serviceForm.name,
          unit: serviceForm.unit,
          unitPriceHt: parseFloat(serviceForm.unitPriceHt),
          tvaRate: parseFloat(serviceForm.tvaRate) || 20,
        }),
      });
      if (!res.ok) throw new Error('Erreur création');
      await fetchServices();
      setShowServiceModal(false);
      setServiceForm({ name: '', unit: '', unitPriceHt: '', tvaRate: '20' });
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la création du service");
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setServiceForm({ ...serviceForm, [e.target.name]: e.target.value });
  };

  // ============ FONCTIONS IMPORTATION ============
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch('/api/products/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.importedCount} produits importés, ${data.errorCount} erreurs.`);
        if (data.errors.length > 0) {
          console.log('Erreurs détaillées:', data.errors);
        }
        await fetchProducts();
        setShowImportModal(false);
        setImportFile(null);
      } else {
        alert('Erreur : ' + data.error);
      }
    } catch (error) {
      console.error("Erreur import :", error);
      alert("Erreur lors de l'importation");
    } finally {
      setImporting(false);
    }
  };

  // ============ CHARGEMENT INITIAL ============
  useEffect(() => {
    fetchProducts();
    fetchServices();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============ RENDU ============
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📦 Catalogue</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importer
          </button>
          {activeTab === "products" ? (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter un produit
            </button>
          ) : (
            <button
              onClick={() => setShowServiceModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter une prestation
            </button>
          )}
        </div>
      </div>

      {/* ============ ONGLETS ============ */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-2 px-1 text-sm font-medium transition ${
            activeTab === "products"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📦 Produits
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`pb-2 px-1 text-sm font-medium transition ${
            activeTab === "services"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🛠️ Prestations
        </button>
      </div>

      {/* ============ CONTENU PRODUITS ============ */}
      {activeTab === "products" && (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">⏳ Chargement...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>📭 Aucun produit trouvé.</p>
                  <p className="text-sm">Ajoutez votre premier produit ou importez via Excel.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prix achat</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prix vente</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">TVA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">{p.name}</td>
                          <td className="px-6 py-4 text-sm">{p.category}</td>
                          <td className="px-6 py-4 text-sm">{p.purchasePrice} €</td>
                          <td className="px-6 py-4 text-sm font-medium">{p.salePrice} €</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              p.stock < 5 ? "bg-red-100 text-red-800" :
                              p.stock < 20 ? "bg-yellow-100 text-yellow-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{p.tvaRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ CONTENU SERVICES ============ */}
      {activeTab === "services" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {services.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>🛠️ Aucune prestation</p>
              <p className="text-sm">Ajoutez votre première prestation en cliquant sur "Ajouter une prestation".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Unité</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prix HT</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{s.name}</td>
                      <td className="px-6 py-4 text-sm">{s.unit}</td>
                      <td className="px-6 py-4 text-sm">{s.unitPriceHt} €</td>
                      <td className="px-6 py-4 text-sm">{s.tvaRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ MODALE PRODUIT ============ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter un produit</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="name" placeholder="Nom du produit *" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="category" placeholder="Catégorie *" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="purchasePrice" placeholder="Prix achat HT *" type="number" step="0.01" value={formData.purchasePrice} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="salePrice" placeholder="Prix vente TTC *" type="number" step="0.01" value={formData.salePrice} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="stock" placeholder="Stock (ex: 50)" type="number" value={formData.stock} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input name="tvaRate" placeholder="TVA % (défaut: 20)" type="number" step="0.1" value={formData.tvaRate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input name="imageUrl" placeholder="Lien image (optionnel)" value={formData.imageUrl} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Ajouter le produit</button>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODALE SERVICE ============ */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowServiceModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter une prestation</h2>
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <input name="name" placeholder="Nom *" value={serviceForm.name} onChange={handleServiceChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="unit" placeholder="Unité (ex: m², heure, forfait) *" value={serviceForm.unit} onChange={handleServiceChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="unitPriceHt" placeholder="Prix HT *" type="number" step="0.01" value={serviceForm.unitPriceHt} onChange={handleServiceChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="tvaRate" placeholder="TVA % (défaut: 20)" type="number" step="0.1" value={serviceForm.tvaRate} onChange={handleServiceChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Ajouter</button>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODALE IMPORTATION ============ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">📥 Importer des produits</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Téléchargez le <a href="/api/products/template" className="text-blue-600 hover:underline" target="_blank">modèle Excel</a>, remplissez-le, puis importez-le ici.
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full p-2 border rounded-lg"
              />
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {importing ? '⏳ Importation en cours...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Plus, Edit, Trash2, Search, Loader2, Upload, CheckCircle
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

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

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/seller/products", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Erreur chargement produits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct
        ? `/api/seller/products/${editingProduct.id}`
        : "/api/seller/products";
      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
        throw new Error(err.error || "Erreur");
      }
      await fetchProducts();
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        category: "",
        purchasePrice: "",
        salePrice: "",
        stock: "",
        tvaRate: "20",
        imageUrl: "",
      });
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      const res = await fetch(`/api/seller/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      await fetchProducts();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category,
      purchasePrice: String(product.purchasePrice),
      salePrice: String(product.salePrice),
      stock: String(product.stock),
      tvaRate: String(product.tvaRate),
      imageUrl: product.imageUrl || "",
    });
    setShowModal(true);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch('/api/seller/products/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur import');
      }
      const data = await res.json();
      alert(`✅ ${data.count} produits importés !`);
      await fetchProducts();
      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      console.error('Erreur import:', error);
      alert('Erreur lors de l\'import : ' + (error as Error).message);
    } finally {
      setImportLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📋 Mon catalogue</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" /> Importer
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: "",
                  description: "",
                  category: "",
                  purchasePrice: "",
                  salePrice: "",
                  stock: "",
                  tvaRate: "20",
                  imageUrl: "",
                });
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Ajouter un produit
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun produit dans votre catalogue.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prix vente</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">No img</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-sm">{p.category}</td>
                      <td className="px-4 py-3 text-sm">{p.salePrice} €</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${p.stock < 5 ? "bg-red-100 text-red-800" : p.stock < 20 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button onClick={() => openEditModal(p)} className="text-blue-600 hover:text-blue-800 mr-2">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODALE AJOUT / MODIFICATION */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-xl w-full max-w-md p-6 relative my-8">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
              <h2 className="text-xl font-bold mb-4">{editingProduct ? "Modifier le produit" : "Ajouter un produit"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input placeholder="Nom *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
                <input placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                <input placeholder="Catégorie *" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Prix achat HT" type="number" step="0.01" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
                  <input placeholder="Prix vente TTC" type="number" step="0.01" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                  <input placeholder="TVA %" type="number" step="0.1" value={formData.tvaRate} onChange={(e) => setFormData({ ...formData, tvaRate: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <input placeholder="URL image" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">{editingProduct ? "Mettre à jour" : "Ajouter"}</button>
              </form>
            </div>
          </div>
        )}

        {/* MODALE IMPORT */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-xl w-full max-w-md p-6 relative my-8">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
              <h2 className="text-xl font-bold mb-4">📤 Importer un catalogue</h2>
              <p className="text-sm text-gray-600 mb-4">
                Téléchargez un fichier CSV ou Excel avec les colonnes :<br/>
                <strong>Nom;Catégorie;PrixAchat;PrixVente;Stock;TVA;URLImage</strong>
              </p>
              <div className="relative w-full mb-4">
                <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">
                      {importFile ? importFile.name : "Cliquez pour choisir un fichier"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">CSV ou Excel (max 5 Mo)</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {importFile && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Fichier sélectionné : {importFile.name}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={!importFile || importLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {importLoading ? 'Importation...' : 'Importer'}
                </button>
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
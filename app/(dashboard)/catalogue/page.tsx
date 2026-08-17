"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Edit, Trash2 } from "lucide-react";

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct
        ? `/api/seller/products/${editingProduct.id}`
        : '/api/seller/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
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
      setEditingProduct(null);
      setFormData({ name: "", description: "", category: "", purchasePrice: "", salePrice: "", stock: "", tvaRate: "20", imageUrl: "" });
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const deleteProduct = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      const res = await fetch(`/api/seller/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur');
      await fetchProducts();
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la suppression");
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📦 Catalogue</h1>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: "", description: "", category: "", purchasePrice: "", salePrice: "", stock: "", tvaRate: "20", imageUrl: "" });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un produit
        </button>
      </div>

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
              <p className="text-sm">Ajoutez votre premier produit en cliquant sur "Ajouter un produit".</p>
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
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
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
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="text-red-600 hover:text-red-800"
                        >
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
      )}

      {/* Modale d'ajout / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="name" placeholder="Nom du produit *" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="category" placeholder="Catégorie *" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="purchasePrice" placeholder="Prix achat HT *" type="number" step="0.01" value={formData.purchasePrice} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="salePrice" placeholder="Prix vente TTC *" type="number" step="0.01" value={formData.salePrice} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              <input name="stock" placeholder="Stock (ex: 50)" type="number" value={formData.stock} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input name="tvaRate" placeholder="TVA % (défaut: 20)" type="number" step="0.1" value={formData.tvaRate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input name="imageUrl" placeholder="URL de l'image (optionnel)" value={formData.imageUrl} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                {editingProduct ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Service = {
  id: string;
  name: string;
  description: string | null;
  serviceCategory: string;
  unit: string;
  unitPrice: number;
  isActive: boolean;
};

export default function ParametresPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serviceCategory: "",
    unit: "m²",
    unitPrice: "",
    isActive: true,
  });

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      } else {
        console.error("Erreur chargement services:", await res.text());
      }
    } catch (error) {
      console.error("Erreur fetchServices:", error);
    }
  };

  useEffect(() => {
    fetchServices().finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = editingService
        ? `/api/services/${editingService.id}`
        : "/api/services";
      const method = editingService ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          unitPrice: parseFloat(formData.unitPrice),
          isActive: formData.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchServices();
      setShowModal(false);
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        serviceCategory: "",
        unit: "m²",
        unitPrice: "",
        isActive: true,
      });
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'enregistrement : " + (error as Error).message);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Supprimer cette prestation ?")) return;
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      await fetchServices();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      serviceCategory: service.serviceCategory,
      unit: service.unit,
      unitPrice: String(service.unitPrice),
      isActive: service.isActive,
    });
    setShowModal(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">⚙️ Paramètres – Prestations</h1>
          <button
            onClick={() => {
              setEditingService(null);
              setFormData({ name: "", description: "", serviceCategory: "", unit: "m²", unitPrice: "", isActive: true });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter une prestation
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {services.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune prestation définie.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unité</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prix</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-sm">{s.serviceCategory}</td>
                      <td className="px-4 py-3 text-sm">{s.unit}</td>
                      <td className="px-4 py-3 text-sm">{s.unitPrice} €</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {s.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button onClick={() => openEditModal(s)} className="text-blue-600 hover:text-blue-800 mr-2"><Edit className="w-4 h-4 inline" /></button>
                        <button onClick={() => deleteService(s.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4 inline" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODALE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative my-8">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            <h2 className="text-xl font-bold mb-4">{editingService ? "Modifier la prestation" : "Ajouter une prestation"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Nom *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              <input placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input placeholder="Catégorie *" value={formData.serviceCategory} onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="m²">m²</option>
                <option value="heure">Heure</option>
                <option value="forfait">Forfait</option>
                <option value="ml">Mètre linéaire</option>
                <option value="unité">Unité</option>
              </select>
              <input placeholder="Prix HT *" type="number" step="0.01" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4" />
                <label className="text-sm text-gray-700">Actif</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">{editingService ? "Mettre à jour" : "Ajouter"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  status: string;
  budgetEstimate: number | null;
  createdAt: string;
};

export default function ProjetsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    budgetEstimate: "",
    description: "",
    type: "",
    length: "",
    width: "",
    height: "",
    surface: "",
    floorWork: "",
    wallCount: "",
    wallWork: "",
    ceilingWork: "",
    countertop: false,
    countertopMaterial: "",
    countertopLength: "",
    countertopDepth: "",
    countertopThickness: "",
    splashback: false,
    splashHeight: "",
    renovationType: "",
  });

  // Calcul automatique de la surface
  const updateSurface = (length: string, width: string) => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    if (l && w && !isNaN(l) && !isNaN(w)) {
      setFormData(prev => ({ ...prev, surface: (l * w).toFixed(2) }));
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("❌ Erreur fetchProjects :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          budgetEstimate: parseFloat(formData.budgetEstimate) || null,
          description: formData.description || null,
          type: formData.type || null,
          length: parseFloat(formData.length) || null,
          width: parseFloat(formData.width) || null,
          height: parseFloat(formData.height) || null,
          surface: parseFloat(formData.surface) || null,
          floorWork: formData.floorWork || null,
          wallCount: parseInt(formData.wallCount) || null,
          wallWork: formData.wallWork || null,
          ceilingWork: formData.ceilingWork || null,
          countertop: formData.countertop,
          countertopMaterial: formData.countertopMaterial || null,
          countertopLength: parseFloat(formData.countertopLength) || null,
          countertopDepth: parseFloat(formData.countertopDepth) || null,
          countertopThickness: parseFloat(formData.countertopThickness) || null,
          splashback: formData.splashback,
          splashHeight: parseFloat(formData.splashHeight) || null,
          renovationType: formData.renovationType || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Erreur : ' + err.error);
        return;
      }

      const data = await res.json();
      await fetchProjects();
      setShowModal(false);
      setFormData({
        name: "",
        budgetEstimate: "",
        description: "",
        type: "",
        length: "",
        width: "",
        height: "",
        surface: "",
        floorWork: "",
        wallCount: "",
        wallWork: "",
        ceilingWork: "",
        countertop: false,
        countertopMaterial: "",
        countertopLength: "",
        countertopDepth: "",
        countertopThickness: "",
        splashback: false,
        splashHeight: "",
        renovationType: "",
      });
      router.push(`/dashboard/projets/${data.id}`);
    } catch (error) {
      console.error("Erreur lors de la création :", error);
      alert("Erreur lors de la création du projet");
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    BROUILLON: "bg-gray-100 text-gray-800",
    EN_ATTENTE: "bg-yellow-100 text-yellow-800",
    EN_COURS: "bg-blue-100 text-blue-800",
    VALIDE: "bg-green-100 text-green-800",
    FACTURE: "bg-purple-100 text-purple-800",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📁 Projets</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Rechercher un projet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">⏳ Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>📭 Aucun projet trouvé.</p>
              <p className="text-sm">Créez votre premier projet en cliquant sur "Nouveau projet".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Budget</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{p.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status as keyof typeof statusColors] || "bg-gray-100"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{p.budgetEstimate ? `${p.budgetEstimate} €` : "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <Link
                          href={`/dashboard/projets/${p.id}`}
                          className="text-blue-600 hover:text-blue-800 mr-2 inline-block"
                        >
                          <Eye className="w-4 h-4 inline" />
                        </Link>
                        <button className="text-blue-600 hover:text-blue-800 mr-2">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
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

      {/* ===== MODALE DE CRÉATION (FORMULAIRE COMPLET) ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative my-8 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">📝 Nouveau projet</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ---- Général ---- */}
              <input
                name="name"
                placeholder="Nom du projet *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Type de projet</option>
                  <option value="cuisine">🍳 Cuisine</option>
                  <option value="sdb">🚿 Salle de bain</option>
                  <option value="terrasse">🌿 Terrasse</option>
                  <option value="salon">🛋️ Salon</option>
                  <option value="chambre">🛏️ Chambre</option>
                  <option value="bureau">💼 Bureau</option>
                  <option value="jardin">🌳 Jardin</option>
                  <option value="autres">🔧 Autres</option>
                </select>
                <input
                  name="budgetEstimate"
                  placeholder="Budget estimé (€)"
                  type="number"
                  value={formData.budgetEstimate}
                  onChange={(e) => setFormData({ ...formData, budgetEstimate: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <textarea
                name="description"
                placeholder="Description interne (optionnel)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              {/* ---- Dimensions ---- */}
              <div className="grid grid-cols-3 gap-2">
                <input
                  name="length"
                  placeholder="Longueur (m)"
                  type="number"
                  step="0.1"
                  value={formData.length}
                  onChange={(e) => {
                    setFormData({ ...formData, length: e.target.value });
                    updateSurface(e.target.value, formData.width);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="width"
                  placeholder="Largeur (m)"
                  type="number"
                  step="0.1"
                  value={formData.width}
                  onChange={(e) => {
                    setFormData({ ...formData, width: e.target.value });
                    updateSurface(formData.length, e.target.value);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="height"
                  placeholder="Hauteur (m)"
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                name="surface"
                placeholder="Surface (m²) - calculée automatiquement"
                type="number"
                step="0.1"
                value={formData.surface}
                onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                readOnly
              />

              {/* ---- SOL ---- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🧱 Sol</label>
                <div className="flex flex-wrap gap-4">
                  {['carrelage', 'peinture', 'conserver'].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="floorWork"
                        value={option}
                        checked={formData.floorWork === option}
                        onChange={(e) => setFormData({ ...formData, floorWork: e.target.value })}
                      />
                      {option === 'carrelage' && 'Carrelage'}
                      {option === 'peinture' && 'Peinture'}
                      {option === 'conserver' && 'Conserver'}
                    </label>
                  ))}
                </div>
              </div>

              {/* ---- MURS ---- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🧱 Murs</label>
                <input
                  name="wallCount"
                  placeholder="Nombre de murs à traiter (0-4)"
                  type="number"
                  min="0"
                  max="4"
                  value={formData.wallCount}
                  onChange={(e) => setFormData({ ...formData, wallCount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {parseInt(formData.wallCount || '0') > 0 && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Que voulez-vous faire des murs ?</label>
                    <div className="flex flex-wrap gap-4">
                      {['carrelage', 'peinture', 'conserver'].map((option) => (
                        <label key={option} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="wallWork"
                            value={option}
                            checked={formData.wallWork === option}
                            onChange={(e) => setFormData({ ...formData, wallWork: e.target.value })}
                          />
                          {option === 'carrelage' && 'Carrelage / Faïence'}
                          {option === 'peinture' && 'Peinture'}
                          {option === 'conserver' && 'Conserver'}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ---- PLAN DE TRAVAIL (cuisine uniquement) ---- */}
              {formData.type === 'cuisine' && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.countertop}
                      onChange={(e) => setFormData({ ...formData, countertop: e.target.checked })}
                    />
                    🪚 Ajouter un plan de travail
                  </label>
                  {formData.countertop && (
                    <div className="mt-2 space-y-2">
                      <select
                        value={formData.countertopMaterial}
                        onChange={(e) => setFormData({ ...formData, countertopMaterial: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Matériau</option>
                        <option value="stratifié">Stratifié</option>
                        <option value="pierre">Pierre</option>
                        <option value="bois">Bois</option>
                        <option value="inox">Inox</option>
                        <option value="autre">Autre</option>
                      </select>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="Longueur (cm)"
                          type="number"
                          value={formData.countertopLength}
                          onChange={(e) => setFormData({ ...formData, countertopLength: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          placeholder="Profondeur (cm)"
                          type="number"
                          value={formData.countertopDepth}
                          onChange={(e) => setFormData({ ...formData, countertopDepth: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          placeholder="Épaisseur (mm)"
                          type="number"
                          value={formData.countertopThickness}
                          onChange={(e) => setFormData({ ...formData, countertopThickness: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ---- PLAFOND ---- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🧱 Plafond</label>
                <div className="flex flex-wrap gap-4">
                  {['peinture', 'conserver'].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="ceilingWork"
                        value={option}
                        checked={formData.ceilingWork === option}
                        onChange={(e) => setFormData({ ...formData, ceilingWork: e.target.value })}
                      />
                      {option === 'peinture' && 'Peinture'}
                      {option === 'conserver' && 'Conserver'}
                    </label>
                  ))}
                </div>
              </div>

              {/* ---- CRÉDENCE (cuisine) ---- */}
              {formData.type === 'cuisine' && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.splashback}
                      onChange={(e) => setFormData({ ...formData, splashback: e.target.checked })}
                    />
                    🧱 Ajouter une crédence
                  </label>
                  {formData.splashback && (
                    <input
                      placeholder="Hauteur (cm)"
                      type="number"
                      value={formData.splashHeight}
                      onChange={(e) => setFormData({ ...formData, splashHeight: e.target.value })}
                      className="mt-2 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              )}

              {/* ---- TYPE DE RÉNOVATION ---- */}
              <select
                name="renovationType"
                value={formData.renovationType}
                onChange={(e) => setFormData({ ...formData, renovationType: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Type de rénovation</option>
                <option value="rafraichissement">Rafraîchissement</option>
                <option value="complet">Rénovation complète</option>
              </select>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Créer le projet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
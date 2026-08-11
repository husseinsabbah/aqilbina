"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

export default function ParametresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    brandColor: "#1E40AF",
    logoUrl: "",
    trade: "", // 👈 AJOUT DE trade
  });

  // Charger les données au montage
  useEffect(() => {
    fetch('/api/user/profile', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setFormData({
          companyName: data.companyName || "",
          brandColor: data.brandColor || "#1E40AF",
          logoUrl: data.logoUrl || "",
          trade: data.trade || "", // 👈 AJOUT DE trade
        });
      })
      .catch(err => console.error("Erreur chargement profil:", err));
  }, []);

  // ===== UPLOAD DU LOGO =====
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      alert('Format non supporté. Utilisez JPG, PNG, WEBP ou SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 2 Mo.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur upload');
      }

      const data = await res.json();
      setFormData(prev => ({ ...prev, logoUrl: data.url }));
      alert('✅ Logo uploadé avec succès !');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // ===== SAUVEGARDE DES PARAMÈTRES =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      alert('✅ Paramètres mis à jour !');
      router.refresh();
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Paramètres</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom de l'entreprise */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom de l'entreprise</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Couleur principale */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Couleur principale</label>
            <input
              type="color"
              value={formData.brandColor}
              onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
              className="w-full h-12 p-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Upload du logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="flex-1 p-2 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && <span className="text-sm text-gray-500">⏳ Upload...</span>}
            </div>
            {formData.logoUrl && (
              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Aperçu :</p>
                <img src={formData.logoUrl} alt="Logo" className="max-h-20 object-contain" />
              </div>
            )}
          </div>

          {/* 👇 METIER - AJOUTÉ ICI */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Métier principal</label>
            <select
              value={formData.trade}
              onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionnez un métier...</option>
              <option value="maçon">🧱 Maçon</option>
              <option value="électricien">⚡ Électricien</option>
              <option value="plombier">💧 Plombier</option>
              <option value="carreleur">🎨 Carreleur</option>
              <option value="peintre">🖌️ Peintre</option>
              <option value="menuiserie">🪚 Menuiserie</option>
              <option value="plâtrier">🧱 Plâtrier</option>
              <option value="couvreur">🏠 Couvreur</option>
              <option value="autres">🔧 Autres</option>
            </select>
          </div>

          {/* Bouton Enregistrer */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </form>
      </div>
    </div>
  );
}
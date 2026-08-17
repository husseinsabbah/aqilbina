"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus, Edit, Trash2, X, Upload, Package, ExternalLink,
  AlertCircle, Loader2, Crown, Store, Building2, Sparkles,
  CheckCircle, XCircle
} from "lucide-react";

type ServiceType = {
  id: string;
  name: string;
  label: string;
  description: string | null;
};

type UserService = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  isDefault: boolean;
  serviceType: ServiceType;
  serviceCategory?: string | null;
};

type Catalog = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
};

type Agent = {
  id: string;
  name: string;
  type: string;
  specialty: string | null;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
};

type UserAgent = {
  id: string;
  agentId: string;
  agent: Agent;
  status: "PENDING" | "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  startDate: string;
  endDate: string | null;
  trialEndDate: string | null;
  cancelledAt: string | null;
  graceEndAt: string | null;
  autoRenew: boolean;
};

export default function ParametresPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [services, setServices] = useState<UserService[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<UserService | null>(null);
  
  // États pour les catalogues
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [catalogForm, setCatalogForm] = useState({ name: "", description: "" });
  const [deletingCatalogId, setDeletingCatalogId] = useState<string | null>(null);

  // États pour les agents
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [userAgentsLoading, setUserAgentsLoading] = useState(false);
  const [cancellingAgentId, setCancellingAgentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    brandColor: "#1E40AF",
    logoUrl: "",
    trade: "",
  });

  const [serviceForm, setServiceForm] = useState({
    serviceTypeId: "",
    name: "",
    description: "",
    unit: "m²",
    unitPrice: "",
    serviceCategory: "",
  });

  const isVendeur = formData.trade === "vendeur";

  // Redirection si non authentifié
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.push("/login");
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetch('/api/user/profile', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setFormData({
          companyName: data.companyName || "",
          brandColor: data.brandColor || "#1E40AF",
          logoUrl: data.logoUrl || "",
          trade: data.trade || "",
        });
      })
      .catch(err => console.error("Erreur chargement profil:", err));

    fetchServices();
    fetch('/api/user/service-types', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setServiceTypes(data))
      .catch(err => console.error("Erreur chargement types:", err));

    fetchUserAgents();
  }, [session]);

  // Charger les catalogues quand l'utilisateur est un vendeur
  useEffect(() => {
    if (isVendeur) {
      fetchCatalogs();
    }
  }, [isVendeur]);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/user/services', { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur chargement services');
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Erreur chargement services :", error);
    }
  };

  const fetchCatalogs = async () => {
    setCatalogsLoading(true);
    try {
      const res = await fetch('/api/seller/catalogs', { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur chargement catalogues');
      const data = await res.json();
      setCatalogs(data);
    } catch (error) {
      console.error("Erreur chargement catalogues :", error);
    } finally {
      setCatalogsLoading(false);
    }
  };

  const fetchUserAgents = async () => {
    setUserAgentsLoading(true);
    try {
      const res = await fetch('/api/user/agents', { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur chargement agents');
      const data = await res.json();
      setUserAgents(data);
    } catch (error) {
      console.error("Erreur chargement agents :", error);
    } finally {
      setUserAgentsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName: formData.companyName,
          brandColor: formData.brandColor,
          logoUrl: formData.logoUrl,
          trade: formData.trade,
        }),
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

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingService
        ? `/api/user/services/${editingService.id}`
        : '/api/user/services';
      const method = editingService ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serviceTypeId: serviceForm.serviceTypeId,
          name: serviceForm.name,
          description: serviceForm.description || null,
          unit: serviceForm.unit,
          unitPrice: parseFloat(serviceForm.unitPrice),
          serviceCategory: serviceForm.serviceCategory || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      await fetchServices();
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({
        serviceTypeId: "",
        name: "",
        description: "",
        unit: "m²",
        unitPrice: "",
        serviceCategory: "",
      });
      alert(editingService ? '✅ Prestation mise à jour !' : '✅ Prestation créée !');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  // ===== Gestion des catalogues =====
  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCatalog
        ? `/api/seller/catalogs/${editingCatalog.id}`
        : '/api/seller/catalogs';
      const method = editingCatalog ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: catalogForm.name.trim(),
          description: catalogForm.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      await fetchCatalogs();
      setShowCatalogModal(false);
      setEditingCatalog(null);
      setCatalogForm({ name: "", description: "" });
      alert(editingCatalog ? '✅ Catalogue mis à jour !' : '✅ Catalogue créé !');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  const deleteCatalog = async (catalog: Catalog) => {
    if (catalog.productCount > 0) {
      alert(`Impossible de supprimer ce catalogue : il contient ${catalog.productCount} produit(s).`);
      return;
    }
    if (!confirm(`Supprimer définitivement le catalogue "${catalog.name}" ?`)) return;
    setDeletingCatalogId(catalog.id);
    try {
      const res = await fetch(`/api/seller/catalogs/${catalog.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      await fetchCatalogs();
      alert('✅ Catalogue supprimé !');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    } finally {
      setDeletingCatalogId(null);
    }
  };

  const openEditCatalogModal = (catalog: Catalog) => {
    setEditingCatalog(catalog);
    setCatalogForm({
      name: catalog.name,
      description: catalog.description || "",
    });
    setShowCatalogModal(true);
  };

  const openCreateCatalogModal = () => {
    setEditingCatalog(null);
    setCatalogForm({ name: "", description: "" });
    setShowCatalogModal(true);
  };

  // ===== Gestion des agents utilisateur =====
  const cancelAgent = async (userAgentId: string) => {
    if (!confirm("Voulez-vous vraiment résilier cet agent ? Vous perdrez l'accès à ses fonctionnalités.")) return;
    setCancellingAgentId(userAgentId);
    try {
      const res = await fetch('/api/user/agents/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userAgentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      await fetchUserAgents();
      alert('✅ Agent résilié avec succès !');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    } finally {
      setCancellingAgentId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      TRIAL: { label: 'Essai gratuit', color: 'bg-blue-100 text-blue-700' },
      ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700' },
      CANCELLED: { label: 'Résilié', color: 'bg-gray-100 text-gray-600' },
      EXPIRED: { label: 'Expiré', color: 'bg-red-100 text-red-700' },
      PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    };
    return map[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'artisan': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'vendeur': return <Store className="w-5 h-5 text-blue-500" />;
      case 'societe': return <Building2 className="w-5 h-5 text-purple-500" />;
      default: return <Sparkles className="w-5 h-5 text-indigo-500" />;
    }
  };

  const toggleServiceStatus = async (service: UserService) => {
    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      if (!res.ok) throw new Error('Erreur');
      await fetchServices();
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  const deleteService = async (service: UserService) => {
    if (service.isDefault) {
      alert('Impossible de supprimer une prestation par défaut.');
      return;
    }
    if (!confirm(`Supprimer "${service.name}" ?`)) return;
    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur');
      await fetchServices();
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  const openEditModal = (service: UserService) => {
    setEditingService(service);
    setServiceForm({
      serviceTypeId: service.serviceType?.id || "",
      name: service.name,
      description: service.description || "",
      unit: service.unit,
      unitPrice: String(service.unitPrice),
      serviceCategory: service.serviceCategory || "",
    });
    setShowServiceModal(true);
  };

  const openCreateModal = () => {
    setEditingService(null);
    setServiceForm({
      serviceTypeId: serviceTypes[0]?.id || "",
      name: "",
      description: "",
      unit: "m²",
      unitPrice: "",
      serviceCategory: "",
    });
    setShowServiceModal(true);
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Veuillez vous connecter</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Paramètres</h1>

      {/* Infos entreprise */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">🏢 Mon entreprise</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom de l'entreprise</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Couleur principale</label>
            <input
              type="color"
              value={formData.brandColor}
              onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
              className="w-full h-12 p-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700">Métier principal</label>
            <select
              value={formData.trade}
              onChange={(e) => {
                const newTrade = e.target.value;
                setFormData({ ...formData, trade: newTrade });
                if (newTrade === 'vendeur') {
                  fetchCatalogs();
                }
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionnez un métier...</option>
              <option value="carreleur">🧱 Carreleur</option>
              <option value="plombier">💧 Plombier</option>
              <option value="electricien">⚡ Électricien</option>
              <option value="peintre">🖌️ Peintre</option>
              <option value="menuisier">🪚 Menuisier</option>
              <option value="maçon">🧱 Maçon</option>
              <option value="couvreur">🏠 Couvreur</option>
              <option value="vendeur">📦 Vendeur de matériaux</option>
              <option value="autres">🔧 Autres</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </form>
      </div>

      {/* Section Mes agents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            🤖 Mes agents
          </h2>
          <button
            onClick={() => router.push('/abonnement')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter un agent
          </button>
        </div>

        {userAgentsLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : userAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Aucun agent actif.</p>
            <p className="text-sm">Souscrivez à un abonnement pour accéder à vos fonctionnalités.</p>
            <button
              onClick={() => router.push('/abonnement')}
              className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Voir les offres
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valable jusqu'au</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userAgents.map((ua) => {
                  const statusInfo = getStatusLabel(ua.status);
                  const endDate = ua.status === 'TRIAL' ? ua.trialEndDate : ua.endDate;
                  return (
                    <tr key={ua.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 flex items-center gap-2">
                        {getAgentIcon(ua.agent.type)}
                        {ua.agent.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{ua.agent.type}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {endDate ? new Date(endDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {ua.status === 'TRIAL' || ua.status === 'ACTIVE' ? (
                          <button
                            onClick={() => cancelAgent(ua.id)}
                            disabled={cancellingAgentId === ua.id}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {cancellingAgentId === ua.id ? (
                              <Loader2 className="w-4 h-4 animate-spin inline" />
                            ) : (
                              'Résilier'
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section Gestion des catalogues (uniquement pour les vendeurs) */}
      {isVendeur && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              📂 Gestion des catalogues
            </h2>
            <button
              onClick={openCreateCatalogModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau catalogue
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Un catalogue regroupe vos produits par catégorie. Chaque produit doit être associé à un catalogue.
          </p>

          {catalogsLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement des catalogues...</div>
          ) : catalogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Aucun catalogue créé.</p>
              <p className="text-sm">Créez votre premier catalogue pour commencer à organiser vos produits.</p>
              <button
                onClick={openCreateCatalogModal}
                className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Créer un catalogue
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Produits</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Créé le</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogs.map((catalog) => (
                    <tr key={catalog.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{catalog.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">
                        {catalog.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          {catalog.productCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(catalog.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => router.push(`/vendeur?catalog=${catalog.id}`)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                          title="Voir les produits du catalogue"
                        >
                          <ExternalLink className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => openEditCatalogModal(catalog)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => deleteCatalog(catalog)}
                          disabled={deletingCatalogId === catalog.id || catalog.productCount > 0}
                          className={`${
                            catalog.productCount > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          title={
                            catalog.productCount > 0
                              ? `Ce catalogue contient ${catalog.productCount} produit(s), impossible de le supprimer.`
                              : 'Supprimer le catalogue'
                          }
                        >
                          {deletingCatalogId === catalog.id ? (
                            <Loader2 className="w-4 h-4 animate-spin inline" />
                          ) : (
                            <Trash2 className="w-4 h-4 inline" />
                          )}
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

      {/* Mes prestations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">🛠️ Mes prestations</h2>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter une prestation
          </button>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucune prestation configurée.</p>
            <p className="text-sm">Ajoutez vos prestations pour qu'elles apparaissent dans vos devis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unité</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {service.name}
                      {service.isDefault && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          Par défaut
                        </span>
                      )}
                      {service.serviceCategory && (
                        <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          {service.serviceCategory}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{service.serviceType?.label || "—"}</td>
                    <td className="px-4 py-3 text-sm">{service.unit}</td>
                    <td className="px-4 py-3 text-sm font-medium">{service.unitPrice.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => toggleServiceStatus(service)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          service.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {service.isActive ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        onClick={() => openEditModal(service)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => deleteService(service)}
                        className={`${service.isDefault ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                        disabled={service.isDefault}
                        title={service.isDefault ? 'Impossible de supprimer une prestation par défaut' : ''}
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

      {/* MODALE PRESTATION */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowServiceModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingService ? 'Modifier la prestation' : 'Ajouter une prestation'}
            </h2>

            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type de prestation *</label>
                <select
                  value={serviceForm.serviceTypeId}
                  onChange={(e) => setServiceForm({ ...serviceForm, serviceTypeId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner un type...</option>
                  {serviceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nom *</label>
                <input
                  type="text"
                  placeholder="Ex: Livraison Beyrouth"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
                <input
                  type="text"
                  placeholder="Description de la prestation"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Unité *</label>
                <select
                  value={serviceForm.unit}
                  onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="m²">m²</option>
                  <option value="unité">unité</option>
                  <option value="heure">heure</option>
                  <option value="forfait">forfait</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Prix unitaire (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="35.00"
                  value={serviceForm.unitPrice}
                  onChange={(e) => setServiceForm({ ...serviceForm, unitPrice: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {isVendeur && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type de service (vendeur)</label>
                  <input
                    type="text"
                    placeholder="ex: Livraison, Conseil technique"
                    value={serviceForm.serviceCategory}
                    onChange={(e) => setServiceForm({ ...serviceForm, serviceCategory: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Exemples : Livraison, Conseil technique, Location d'outillage.</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {editingService ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CATALOGUE */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCatalogModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingCatalog ? 'Modifier le catalogue' : 'Créer un catalogue'}
            </h2>

            <form onSubmit={handleCatalogSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom du catalogue *</label>
                <input
                  type="text"
                  placeholder="Ex: Carrelage, Plomberie, Électricité..."
                  value={catalogForm.name}
                  onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Un nom unique pour ce catalogue.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description (optionnelle)</label>
                <textarea
                  placeholder="Décrivez ce catalogue..."
                  value={catalogForm.description}
                  onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {editingCatalog ? 'Mettre à jour' : 'Créer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
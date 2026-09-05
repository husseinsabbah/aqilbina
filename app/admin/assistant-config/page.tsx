"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Edit, Trash2, X, Loader2, Sparkles } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
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
  agent?: Agent | null;
  customName?: string | null;
  status: "PENDING" | "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  startDate: string;
  endDate: string | null;
  trialEndDate: string | null;
  cancelledAt: string | null;
  graceEndAt: string | null;
  autoRenew: boolean;
};

type AssistantConfig = {
  id: string;
  name: string;
  role: string;
  tone: string;
  systemPrompt: string;
  rules: string;
  isActive: boolean;
  agentId: string;
  agent?: { name?: string | null; type?: string | null } | null;
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function AdminAssistantConfigPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [assistantConfigs, setAssistantConfigs] = useState<AssistantConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AssistantConfig | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    agentId: "",
    name: "",
    role: "Assistant vendeur expert",
    tone: "professionnel, utile, précis",
    systemPrompt: "Tu es un assistant expert pour aider un vendeur à recommander des produits. Tu restes dans le contexte du projet et tu n'inventes jamais d'informations.",
    rules: "Tu ne proposes que des produits présents dans le catalogue. Tu n'inventes ni prix, ni stock, ni délai. Si une information manque, demande un détail court. Réponds en français et de manière claire.",
    isActive: true,
  });

  // Vérification admin
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
  }, [session, sessionStatus, router]);

  // Charger les agents utilisateur et les configurations
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, configsRes] = await Promise.all([
          fetch("/api/user/agents?detail=true", { credentials: "include" }),
          fetch("/api/admin/assistant-config", { credentials: "include" }),
        ]);

        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setUserAgents(Array.isArray(agentsData) ? agentsData : []);
        }

        if (configsRes.ok) {
          const configsData = await configsRes.json();
          setAssistantConfigs(Array.isArray(configsData) ? configsData : []);
        }
      } catch (error) {
        console.error("Erreur chargement données:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === "admin") {
      fetchData();
    }
  }, [session]);

  const openCreateModal = () => {
    const activeAgent = userAgents.find((ua) => ua.status === "TRIAL" || ua.status === "ACTIVE") || userAgents[0];
    setEditingConfig(null);
    setFormData({
      agentId: activeAgent?.agentId || "",
      name: "",
      role: "Assistant vendeur expert",
      tone: "professionnel, utile, précis",
      systemPrompt:
        "Tu es un assistant expert pour aider un vendeur à recommander des produits. Tu restes dans le contexte du projet et tu n'inventes jamais d'informations.",
      rules: "Tu ne proposes que des produits présents dans le catalogue. Tu n'inventes ni prix, ni stock, ni délai. Si une information manque, demande un détail court. Réponds en français et de manière claire.",
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (config: AssistantConfig) => {
    setEditingConfig(config);
    setFormData({
      agentId: config.agentId,
      name: config.name,
      role: config.role,
      tone: config.tone,
      systemPrompt: config.systemPrompt,
      rules: config.rules,
      isActive: !!config.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agentId) {
      alert("Veuillez sélectionner un agent pour cette configuration.");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        agentId: formData.agentId,
        name: formData.name.trim(),
        role: formData.role.trim(),
        tone: formData.tone.trim(),
        systemPrompt: formData.systemPrompt.trim(),
        rules: formData.rules.trim(),
        isActive: formData.isActive,
      };

      const url = editingConfig ? `/api/admin/assistant-config/${editingConfig.id}` : "/api/admin/assistant-config";
      const method = editingConfig ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }

      // Si la config est active, désactiver les autres pour le même agent
      if (formData.isActive) {
        const sameAgentConfigs = assistantConfigs.filter(
          (cfg) => cfg.agentId === formData.agentId && cfg.id !== editingConfig?.id,
        );
        await Promise.all(
          sameAgentConfigs.map((cfg) =>
            fetch(`/api/admin/assistant-config/${cfg.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ isActive: false }),
            }),
          ),
        );
      }

      // Rafraîchir la liste
      const configsRes = await fetch("/api/admin/assistant-config", { credentials: "include" });
      if (configsRes.ok) {
        const configsData = await configsRes.json();
        setAssistantConfigs(Array.isArray(configsData) ? configsData : []);
      }

      setShowModal(false);
      setEditingConfig(null);
      alert(editingConfig ? "✅ Configuration mise à jour !" : "✅ Configuration créée !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActive = async (config: AssistantConfig) => {
    try {
      const res = await fetch(`/api/admin/assistant-config/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !config.isActive }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }

      // Si on active, désactiver les autres pour le même agent
      if (!config.isActive) {
        const sameAgentConfigs = assistantConfigs.filter((cfg) => cfg.agentId === config.agentId && cfg.id !== config.id);
        await Promise.all(
          sameAgentConfigs.map((cfg) =>
            fetch(`/api/admin/assistant-config/${cfg.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ isActive: false }),
            }),
          ),
        );
      }

      const configsRes = await fetch("/api/admin/assistant-config", { credentials: "include" });
      if (configsRes.ok) {
        const configsData = await configsRes.json();
        setAssistantConfigs(Array.isArray(configsData) ? configsData : []);
      }
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const deleteConfig = async (config: AssistantConfig) => {
    if (!confirm(`Supprimer la configuration "${config.name}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/assistant-config/${config.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }

      const configsRes = await fetch("/api/admin/assistant-config", { credentials: "include" });
      if (configsRes.ok) {
        const configsData = await configsRes.json();
        setAssistantConfigs(Array.isArray(configsData) ? configsData : []);
      }
      alert("✅ Configuration supprimée !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            🧠 Assistant IA - Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les configurations des assistants IA pour chaque agent.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouvelle config
        </button>
      </div>

      {assistantConfigs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune configuration d'assistant créée.</p>
          <p className="text-sm text-gray-400">
            Créez une configuration pour définir le comportement de l'IA et l'activer par défaut.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Créer une configuration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assistantConfigs.map((config) => (
            <div
              key={config.id}
              className={`rounded-2xl border p-5 shadow-sm transition ${
                config.isActive ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{config.name}</h3>
                  <p className="text-xs text-gray-500">
                    {config.agent?.name || "Agent"} • {config.role}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Agent ID: {config.agentId}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                    config.isActive ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {config.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Ton</span>
                  <span className="text-sm">{config.tone}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Prompt système</span>
                  <span className="text-sm line-clamp-3">{config.systemPrompt}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Règles</span>
                  <span className="text-sm line-clamp-2">{config.rules}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEditModal(config)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50"
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Modifier
                </button>
                <button
                  onClick={() => toggleActive(config)}
                  className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {config.isActive ? "Désactiver" : "Activer"}
                </button>
                <button
                  onClick={() => deleteConfig(config)}
                  className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingConfig(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingConfig ? "Modifier la configuration" : "Créer une configuration IA"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Agent *</label>
                <select
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Sélectionner un agent</option>
                  {userAgents.map((ua) => (
                    <option key={ua.id} value={ua.agentId}>
                      {(ua.customName || ua.agent?.name || "Agent")} ({ua.agent?.type || "vendeur"})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Seuls les agents actifs ou en essai apparaissent ici.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nom de la configuration *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rôle *</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Ton *</label>
                <input
                  type="text"
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Prompt système *</label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Règles métier *</label>
                <textarea
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  id="admin-assistant-active"
                />
                <label htmlFor="admin-assistant-active" className="text-sm text-gray-700">
                  Activer cette configuration
                </label>
                <span className="text-xs text-gray-400 ml-2">
                  (Une seule configuration par agent peut être active à la fois.)
                </span>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {formLoading ? "Enregistrement..." : editingConfig ? "Mettre à jour" : "Créer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
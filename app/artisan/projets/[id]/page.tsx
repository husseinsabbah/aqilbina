"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle, XCircle, Loader2, ArrowLeft,
  Sparkles
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// Types (optionnels, pour une meilleure autocomplétion)
type ProjectItem = {
  id: string;
  productName: string | null;
  serviceName: string | null;
  quantity: number;
  unitPriceHtAtSale: number;
  tvaRate: number;
};

type Proposal = {
  id: string;
  quantity: number;
  unitPrice: number;
  status: string;
  message: string | null;
  marketingMessage: string | null;
  deliveryDate: string | null;
  createdAt: string;
  product: { name: string; salePrice: number };
  vendor: { name: string; companyName: string | null };
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [projectForm, setProjectForm] = useState({
    startDate: '',
    endDate: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientFeedbackStatus: 'PENDING',
    clientFeedbackMessage: '',
    sharePublicUrl: '',
    projectProgressMedia: '',
    portfolioMedia: '',
    clientBudgetMax: '',
  });

  const updateProjectMeta = async () => {
    if (!projectId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(projectForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      await fetchProject();
      alert('✅ Informations du projet mises à jour');
    } catch (error) {
      console.error('Erreur mise à jour projet:', error);
      alert('Erreur lors de la mise à jour : ' + (error as Error).message);
    }
  };

  // ===== FETCH PROJECT =====
  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setProjectForm({
          startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 10) : '',
          endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 10) : '',
          clientName: data.clientName || '',
          clientPhone: data.clientPhone || '',
          clientEmail: data.clientEmail || '',
          clientAddress: data.clientAddress || '',
          clientFeedbackStatus: data.clientFeedbackStatus || 'PENDING',
          clientFeedbackMessage: data.clientFeedbackMessage || '',
          sharePublicUrl: data.sharePublicUrl || '',
          projectProgressMedia: data.projectProgressMedia || '',
          portfolioMedia: data.portfolioMedia || '',
          clientBudgetMax: data.clientBudgetMax != null ? String(data.clientBudgetMax) : '',
        });
      } else {
        console.error("Erreur fetch project:", await res.text());
      }
    } catch (error) {
      console.error("Erreur chargement projet:", error);
    }
  };

  // ===== FETCH PROPOSALS =====
  const fetchProposals = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/proposals`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      } else {
        console.error("Erreur fetch proposals:", await res.text());
      }
    } catch (error) {
      console.error("Erreur chargement offres:", error);
    }
  };

  // ===== ACCEPTER OFFRE =====
  const handleAccept = async (proposalId: string) => {
    if (!confirm("Accepter cette offre ?")) return;
    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchProposals();
      alert("✅ Offre acceptée !");
    } catch (error) {
      console.error("Erreur acceptation:", error);
      alert("Erreur lors de l'acceptation : " + (error as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // ===== REFUSER OFFRE =====
  const handleRefuse = async (proposalId: string) => {
    const reason = window.prompt(
      "Raison du refus ?\n1 = Prix trop élevé\n2 = Délais incompatibles\n3 = Qualité / produit non adapté\n4 = Autre",
      "1"
    );
    if (reason === null) return;

    const reasonMap: Record<string, string> = {
      '1': 'PRIX_TROP_ELEVE',
      '2': 'DELAIS_INCOMPATIBLES',
      '3': 'QUALITE_NON_ADAPTEE',
      '4': 'AUTRE',
    };

    const normalizedReason = reasonMap[reason.trim()] || 'AUTRE';
    const details = window.prompt("Décrivez précisément la raison du refus (ou laissez vide si aucun détail).", "") || '';

    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/refuse`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: normalizedReason, details }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchProposals();
      alert("Offre refusée avec motif enregistré.");
    } catch (error) {
      console.error("Erreur refus:", error);
      alert("Erreur lors du refus : " + (error as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // ===== IA (appel à l'API assistant/advice) =====
  const handleAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/assistant/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        const data = await res.json();
        let analysisText = '';
        if (data.advice && Array.isArray(data.advice)) {
          analysisText = data.advice.map((item: any) => {
            return `🔹 ${item.title}\n${item.description}\n${item.action ? '➡️ ' + item.action : ''}\n`;
          }).join('\n');
        } else if (data.analysis) {
          analysisText = data.analysis;
        } else {
          analysisText = JSON.stringify(data, null, 2);
        }
        setAiAnalysis(analysisText);
      } else {
        const err = await res.json();
        alert('Erreur lors de l’analyse IA : ' + (err.error || ''));
      }
    } catch (error) {
      console.error(error);
      alert('Erreur réseau lors de l’analyse IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleArtisanAssistant = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/artisan/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || 'Erreur lors du calcul assistant');
      }

      const data = await res.json();
      setAssistantData(data);
      setAiAnalysis('Assistant artisan prêt : estimations, plan de chantier et comparaison d’offres disponibles ci-dessous.');
    } catch (error) {
      console.error('Erreur assistant artisan:', error);
      alert(error instanceof Error ? error.message : 'Erreur réseau lors de l’assistant artisan');
    } finally {
      setAiLoading(false);
    }
  };

  // ===== LOAD =====
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchProposals()]);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Projet introuvable.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Bouton retour */}
        <button
          onClick={() => router.push("/artisan")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à mes projets
        </button>

        {/* Détails du projet */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
            <button
              onClick={updateProjectMeta}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition text-sm"
            >
              Enregistrer les infos projet
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Date de début</span>
              <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Date de fin</span>
              <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Nom client</span>
              <input type="text" value={projectForm.clientName} onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Téléphone</span>
              <input type="text" value={projectForm.clientPhone} onChange={(e) => setProjectForm({ ...projectForm, clientPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1 font-medium">Email client</span>
              <input type="email" value={projectForm.clientEmail} onChange={(e) => setProjectForm({ ...projectForm, clientEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1 font-medium">Adresse client</span>
              <input type="text" value={projectForm.clientAddress} onChange={(e) => setProjectForm({ ...projectForm, clientAddress: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Statut client</span>
              <select value={projectForm.clientFeedbackStatus} onChange={(e) => setProjectForm({ ...projectForm, clientFeedbackStatus: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="PENDING">En attente</option>
                <option value="CONFIRMED">Confirmé</option>
                <option value="REQUEST_CHANGES">Demande des modifications</option>
                <option value="REJECTED">Refusé</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">URL publique du projet</span>
              <input type="text" value={projectForm.sharePublicUrl} onChange={(e) => setProjectForm({ ...projectForm, sharePublicUrl: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://..." />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1 font-medium">Commentaire client / retour</span>
              <textarea value={projectForm.clientFeedbackMessage} onChange={(e) => setProjectForm({ ...projectForm, clientFeedbackMessage: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} />
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Budget max client ($)</span>
              <input type="number" min="0" step="0.01" value={projectForm.clientBudgetMax} onChange={(e) => setProjectForm({ ...projectForm, clientBudgetMax: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="2000" />
            </label>
            <div className="text-sm text-gray-700 md:col-span-1">
              <span className="block mb-1 font-medium">Médias de progression</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('file', file);
                  try {
                    const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Upload impossible');
                    setProjectForm((prev) => ({ ...prev, projectProgressMedia: data.url }));
                    alert('Média ajouté avec succès');
                  } catch (error) {
                    alert('Erreur upload média : ' + (error as Error).message);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {projectForm.projectProgressMedia && (
                <div className="mt-2 text-xs text-gray-500 break-all">{projectForm.projectProgressMedia}</div>
              )}
            </div>
            <div className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1 font-medium">Médias de portfolio final</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('file', file);
                  try {
                    const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Upload impossible');
                    setProjectForm((prev) => ({ ...prev, portfolioMedia: data.url }));
                    alert('Média ajouté avec succès');
                  } catch (error) {
                    alert('Erreur upload média : ' + (error as Error).message);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {projectForm.portfolioMedia && (
                <div className="mt-2 text-xs text-gray-500 break-all">{projectForm.portfolioMedia}</div>
              )}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p className="text-gray-500">Type : {project.type || "Non spécifié"}</p>
            <p className="text-gray-500">Surface : {project.surface || "Non renseignée"} m²</p>
            <p className="text-gray-500">Statut : {project.status}</p>
            {project.clientBudgetMax != null && (
              <p className="text-gray-500">Budget max client : {project.clientBudgetMax} €</p>
            )}
            {project.budgetEstimate && (
              <p className="text-gray-500">Budget estimé : {project.budgetEstimate} €</p>
            )}
          </div>
          {project.description && (
            <div className="mt-2 text-sm text-gray-600">{project.description}</div>
          )}

          {project.items && project.items.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">📦 Matériaux / Prestations :</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {project.items.map((item: any) => {
                  const name = item.product?.name || item.service?.name || 'Inconnu';
                  return (
                    <li key={item.id}>
                      {name} – {item.quantity} unité(s) – {item.unitPriceHtAtSale} € HT
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Offres reçues */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📨 Offres reçues pour ce projet</h2>
          {proposals.length === 0 ? (
            <p className="text-gray-500">Aucune offre reçue pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vendeur</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produit</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{p.vendor?.companyName || p.vendor?.name || "Inconnu"}</td>
                      <td className="px-4 py-3 text-sm">{p.product.name}</td>
                      <td className="px-4 py-3 text-sm">{p.quantity}</td>
                      <td className="px-4 py-3 text-sm">{p.unitPrice} €</td>
                      <td className="px-4 py-3 text-sm font-medium">{(p.quantity * p.unitPrice).toFixed(2)} €</td>
                      <td className="px-4 py-3 text-sm">
                        {p.status === "EN_ATTENTE" && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">En attente</span>}
                        {p.status === "ACCEPTE" && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Acceptée</span>}
                        {p.status === "REFUSE" && <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Refusée</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {p.status === "EN_ATTENTE" && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleAccept(p.id)}
                              disabled={actionLoading === p.id}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Accepter
                            </button>
                            <button
                              onClick={() => handleRefuse(p.id)}
                              disabled={actionLoading === p.id}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Refuser
                            </button>
                          </div>
                        )}
                        {p.status !== "EN_ATTENTE" && <span className="text-xs text-gray-400">Déjà traité</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assistant IA */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> Assistant IA – Conseils pour ce projet
            </h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleAIAnalysis}
                disabled={aiLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Analyse en cours...' : 'Analyser avec IA'}
              </button>
              <button
                onClick={handleArtisanAssistant}
                disabled={aiLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Calcul...' : 'Assistant artisan'}
              </button>
            </div>
          </div>

          {aiAnalysis ? (
            <div className="bg-white rounded-lg p-4 border border-purple-100 whitespace-pre-wrap text-sm mb-4">
              {aiAnalysis}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Cliquez sur "Analyser avec IA" pour obtenir des recommandations personnalisées pour ce projet.
            </p>
          )}

          {assistantData && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-emerald-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Estimations</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">{assistantData.summary?.materials ?? 0}</p>
                  <p className="text-sm text-gray-600">matières calculées</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Étapes</p>
                  <p className="mt-2 text-2xl font-bold text-blue-700">{assistantData.summary?.steps ?? 0}</p>
                  <p className="text-sm text-gray-600">étapes de chantier</p>
                </div>
                <div className="bg-white rounded-xl border border-violet-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-violet-600 font-semibold">Offres</p>
                  <p className="mt-2 text-2xl font-bold text-violet-700">{assistantData.summary?.offers ?? 0}</p>
                  <p className="text-sm text-gray-600">comparaisons générées</p>
                </div>
              </div>

              {assistantData.estimate && assistantData.estimate.length > 0 && (
                <div className="bg-white rounded-xl border border-emerald-100 p-4">
                  <h3 className="text-base font-semibold mb-3 text-gray-800">📦 Estimation matériaux</h3>
                  <div className="space-y-2">
                    {assistantData.estimate.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-gray-800">{item.material}</p>
                          <p className="text-sm text-gray-500">{item.quantity} {item.unit}</p>
                        </div>
                        <p className="font-semibold text-emerald-700">{Number(item.totalPrice ?? 0).toFixed(2)} €</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assistantData.steps && assistantData.steps.length > 0 && (
                <div className="bg-white rounded-xl border border-blue-100 p-4">
                  <h3 className="text-base font-semibold mb-3 text-gray-800">🗓️ Plan de chantier</h3>
                  <ol className="space-y-3">
                    {assistantData.steps.map((step: any) => (
                      <li key={step.id} className="flex gap-3 items-start">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{step.order}</span>
                        <div>
                          <p className="font-medium text-gray-800">{step.title}</p>
                          {step.description && <p className="text-sm text-gray-600">{step.description}</p>}
                          {step.durationDays && <p className="text-xs text-gray-500 mt-1">Durée estimée : {step.durationDays} jour(s)</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {assistantData.comparisons && assistantData.comparisons.length > 0 && (
                <div className="bg-white rounded-xl border border-violet-100 p-4">
                  <h3 className="text-base font-semibold mb-3 text-gray-800">🏷️ Comparaison d’offres</h3>
                  <div className="grid gap-3">
                    {assistantData.comparisons.map((offer: any) => (
                      <div key={offer.id} className="border border-violet-100 rounded-lg p-3 bg-violet-50/40">
                        <div className="flex justify-between items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-800">{offer.vendor?.companyName || offer.vendor?.name || 'Vendeur'}</p>
                            <p className="text-sm text-gray-600">{offer.deliveryDays ? `Livraison : ${offer.deliveryDays} jours` : 'Livraison : non précisée'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-violet-700">{Number(offer.totalPrice ?? 0).toFixed(2)} €</p>
                            <p className="text-xs text-gray-500">Score {offer.score ?? '—'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{offer.products}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
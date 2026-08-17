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
  const [aiLoading, setAiLoading] = useState(false);

  // ===== FETCH PROJECT =====
  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
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
    if (!confirm("Refuser cette offre ?")) return;
    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/refuse`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchProposals();
      alert("Offre refusée.");
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
        // La réponse peut contenir un champ "advice" (tableau) ou "analysis" selon l'API.
        // On formate pour l'affichage.
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
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p className="text-gray-500">Type : {project.type || "Non spécifié"}</p>
            <p className="text-gray-500">Surface : {project.surface || "Non renseignée"} m²</p>
            <p className="text-gray-500">Statut : {project.status}</p>
            {project.budgetEstimate && (
              <p className="text-gray-500">Budget estimé : {project.budgetEstimate} €</p>
            )}
          </div>
          {project.description && (
            <div className="mt-2 text-sm text-gray-600">{project.description}</div>
          )}

          {/* Items du projet */}
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> Assistant IA – Conseils pour ce projet
            </h2>
            <button
              onClick={handleAIAnalysis}
              disabled={aiLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? 'Analyse en cours...' : 'Analyser avec IA'}
            </button>
          </div>
          {aiAnalysis ? (
            <div className="bg-white rounded-lg p-4 border border-purple-100 whitespace-pre-wrap text-sm">
              {aiAnalysis}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Cliquez sur "Analyser avec IA" pour obtenir des recommandations personnalisées pour ce projet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
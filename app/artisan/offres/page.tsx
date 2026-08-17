"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Proposal = {
  id: string;
  projectId: string;
  productId: string;
  userId: string;
  quantity: number;
  unitPrice: number;
  status: string;
  message: string | null;
  marketingMessage: string | null;
  deliveryDate: string | null;
  createdAt: string;
  product: { name: string; salePrice: number };
  vendor: { name: string; companyName: string | null };
  project: { name: string };
};

export default function OffresPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/artisan/proposals", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (error) {
      console.error("Erreur chargement offres:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleAccept = async (proposalId: string) => {
    if (!confirm("Accepter cette offre ?")) return;
    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      await fetchProposals();
      alert("✅ Offre acceptée !");
    } catch (error) {
      console.error("Erreur acceptation:", error);
      alert("Erreur lors de l'acceptation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async (proposalId: string) => {
    if (!confirm("Refuser cette offre ?")) return;
    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/refuse`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      await fetchProposals();
      alert("Offre refusée.");
    } catch (error) {
      console.error("Erreur refus:", error);
      alert("Erreur lors du refus");
    } finally {
      setActionLoading(null);
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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📨 Offres reçues</h1>

        {proposals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune offre reçue pour le moment.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vendeur</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Projet</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produit</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => {
                    const total = p.quantity * p.unitPrice;
                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{p.vendor?.companyName || p.vendor?.name || "Inconnu"}</td>
                        <td className="px-4 py-3 text-sm">{p.project?.name || p.projectId}</td>
                        <td className="px-4 py-3 text-sm">{p.product.name}</td>
                        <td className="px-4 py-3 text-sm">{p.quantity}</td>
                        <td className="px-4 py-3 text-sm">{p.unitPrice} €</td>
                        <td className="px-4 py-3 text-sm font-medium">{total.toFixed(2)} €</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Eye, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Project = {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  surface: number | null;
  status: string;
  budgetEstimate: number | null;
  createdAt: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  startDate: string | null;
  endDate: string | null;
  items: { id: string; productName: string; quantity: number }[];
};

export default function ProjetsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Erreur chargement projets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'artisan' && session.user.trade !== 'artisan') {
      router.push('/auth/signin');
      return;
    }

    const checkAccess = async () => {
      try {
        const res = await fetch('/api/user/agents/check', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.hasActive) {
          router.push('/abonnement');
          return;
        }
      } catch {
        router.push('/abonnement');
        return;
      }

      await fetchProjects();
    };

    void checkAccess();
  }, [session, router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BROUILLON": return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Brouillon</span>;
      case "EN_ATTENTE": return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">En attente</span>;
      case "ACCEPTE": return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Accepté</span>;
      case "TERMINE": return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Terminé</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{status}</span>;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📋 Mes projets</h1>
          <button
            onClick={() => router.push("/artisan/projets/nouveau")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nouveau projet
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun projet créé.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800">{project.name}</h3>
                  {getStatusBadge(project.status)}
                </div>
                <p className="text-sm text-gray-600 mt-1">{project.description || "Aucune description"}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <span>Type : {project.type || "Non spécifié"}</span>
                  {project.surface && <span className="ml-2">Surface : {project.surface} m²</span>}
                  {project.budgetEstimate && <span className="ml-2">Budget : {project.budgetEstimate} €</span>}
                </div>
                {project.clientName && (
                  <p className="text-xs text-gray-500 mt-1">Client : {project.clientName}</p>
                )}
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500">Produits demandés :</p>
                  <ul className="text-xs text-gray-600 list-disc list-inside">
                    {project.items.length > 0 ? (
                      project.items.map((item) => (
                        <li key={item.id}>{item.productName} (x{item.quantity})</li>
                      ))
                    ) : (
                      <li>Aucun produit</li>
                    )}
                  </ul>
                </div>
                <button
                  onClick={() => router.push(`/artisan/projets/${project.id}`)}
                  className="mt-3 text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" /> Voir les offres
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
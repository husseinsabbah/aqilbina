"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Clock3, Loader2, MapPin, User } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type RequestRecipient = {
  id: string;
  status: string;
  trade: string;
  message: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    description: string | null;
    type: string | null;
    surface: number | null;
    budgetEstimate: number | null;
    clientName: string | null;
    clientAddress: string | null;
    status: string;
    sharePublicUrl: string | null;
    projectAccessPin: string | null;
    createdAt: string;
  };
};

const statusLabels: Record<string, string> = {
  INVITE: "Nouvelle demande",
  VUE: "Vue",
  CANDIDAT: "Candidature envoyée",
  NEGOCIATION: "En discussion",
  RETENU: "Professionnel retenu",
  REFUSE: "Refusée",
  NON_RETENU: "Autre professionnel retenu",
};

export default function VendeurDemandesPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<RequestRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/vendor/requests", { credentials: "include" });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || "Erreur de chargement des demandes");
        }

        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 pl-64">
        <div className="mx-auto max-w-6xl p-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-blue-600">Vendeur</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Demandes de devis reçues</h1>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {requests.length} demande{requests.length > 1 ? "s" : ""}
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Chargement des demandes…</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Aucune demande de devis reçue pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {statusLabels[request.status] || request.status}
                        </span>
                        {request.trade && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {request.trade}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-slate-900">{request.project.name}</h2>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1"><User className="h-4 w-4" /> {request.project.clientName || "Client anonyme"}</span>
                        {request.project.type && <span>{request.project.type}</span>}
                        {request.project.surface && <span>{request.project.surface} m²</span>}
                        {request.project.budgetEstimate && <span>{request.project.budgetEstimate} €</span>}
                      </div>

                      {request.project.description && (
                        <p className="text-sm text-slate-600">{request.project.description}</p>
                      )}

                      {(request.project.clientAddress || request.message) && (
                        <div className="space-y-1 text-sm text-slate-500">
                          {request.project.clientAddress && (
                            <div className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {request.project.clientAddress}</div>
                          )}
                          {request.message && <div>{request.message}</div>}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-[220px] flex-col gap-2 text-sm text-slate-600">
                      <div className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {new Date(request.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                      <Link
                        href={`/projets/${request.project.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Voir le projet <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

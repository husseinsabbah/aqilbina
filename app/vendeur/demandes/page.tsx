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
              {requests.map((request) => {
                const statusLabel = statusLabels[request.status] || request.status;
                const project = request.project;

                return (
                  <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {statusLabel}
                          </span>
                          {request.trade && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {request.trade}
                            </span>
                          )}
                        </div>

                        <div>
                          <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
                          <p className="mt-1 text-sm text-slate-500">
                            {project.type || "Projet non précisé"} · {project.surface ? `${project.surface} m²` : "Surface non renseignée"}
                          </p>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Client</p>
                            <p className="mt-2 inline-flex items-center gap-2 font-medium text-slate-800">
                              <User className="h-4 w-4" /> {project.clientName || "Client anonyme"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Budget</p>
                            <p className="mt-2 font-medium text-slate-800">
                              {project.budgetEstimate ? `${project.budgetEstimate} €` : "Non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Date</p>
                            <p className="mt-2 inline-flex items-center gap-2 font-medium text-slate-800">
                              <Clock3 className="h-4 w-4" /> {new Date(project.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Association</p>
                            <p className="mt-2 font-medium text-slate-800">Aucun artisan associé</p>
                          </div>
                        </div>

                        {project.description && (
                          <p className="text-sm leading-6 text-slate-600">{project.description}</p>
                        )}

                        {(project.clientAddress || request.message) && (
                          <div className="space-y-2 text-sm text-slate-500">
                            {project.clientAddress && (
                              <div className="inline-flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> {project.clientAddress}
                              </div>
                            )}
                            {request.message && <div>{request.message}</div>}
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-[230px] flex-col gap-3 xl:items-end">
                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          <p className="font-medium text-slate-800">Action</p>
                          <p className="mt-1">Vérifier la demande et ouvrir le projet pour poursuivre.</p>
                        </div>

                        <Link
                          href={`/projets/${project.id}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          Voir le projet <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const REASON_OPTIONS = [
  { value: "PRIX_TROP_ELEVE", label: "Prix trop élevé" },
  { value: "DELAIS_INCOMPATIBLES", label: "Délais incompatibles" },
  { value: "QUALITE_NON_ADAPTEE", label: "Qualité / produit non adapté" },
  { value: "AUTRE", label: "Autre" },
];

export default function ProjectPublicPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("PRIX_TROP_ELEVE");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/public`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) {
            setProject(null);
            setMessage("Ce devis n’existe plus ou le lien est invalide. Contactez l’artisan pour obtenir un nouveau lien.");
            return;
          }
          throw new Error(`Erreur serveur (${res.status})`);
        }

        const data = await res.json();
        setProject(data);
        if (data.clientName) {
          setMessage(`Bonjour ${data.clientName}, merci de confirmer ou refuser le devis.`);
        }
      } catch (error) {
        setProject(null);
        setMessage("Ce projet n’est pas disponible ou le lien est invalide.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchProject();
  }, [projectId]);

  const total = useMemo(() => {
    if (!project?.items?.length) return 0;
    return project.items.reduce((sum: number, item: any) => {
      const price = Number(item.unitPriceHtAtSale || 0);
      const qty = Number(item.quantity || 0);
      return sum + price * qty;
    }, 0);
  }, [project]);

  const projectSummary = useMemo(() => {
    if (!project?.description) return [];

    try {
      const parsed = JSON.parse(project.description);
      if (parsed && typeof parsed === 'object') {
        const lines: string[] = [];
        if (parsed.description) lines.push(`description: ${parsed.description}`);
        if (parsed.sol?.surface != null) lines.push(`surface sol: ${parsed.sol.surface}`);
        if (parsed.mur?.walls?.length) {
          parsed.mur.walls.forEach((wall: any, index: number) => {
            const wallSurface = Number(wall.longueur || 0) * Number(wall.hauteur || 0);
            lines.push(`surface mur ${index + 1}: ${wallSurface}`);
          });
        }
        return lines;
      }
    } catch {
      return [`description: ${project.description}`];
    }

    return [`description: ${project.description}`];
  }, [project]);

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/client-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          details,
          clientName: project?.clientName || "Abdul",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur lors du refus du devis");

      setMessage("Votre refus a bien été enregistré. Merci pour votre retour, il sera analysé pour améliorer les prochains devis.");
    } catch (error) {
      console.error("Erreur refus devis:", error);
      setMessage(error instanceof Error ? error.message : "Erreur lors du refus du devis.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Chargement du devis...</div>;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Devis introuvable</h1>
          <p className="text-slate-600">{message || "Ce devis n’existe plus ou le lien est invalide."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Devis client</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{project.name}</h1>
            </div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
              Statut : {project.status || "BROUILLON"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-slate-500">Client</div>
              <div className="mt-1 font-semibold text-slate-900">{project.clientName || "Abdul"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-slate-500">Budget max client</div>
              <div className="mt-1 font-semibold text-slate-900">{project.clientBudgetMax ? `${project.clientBudgetMax} €` : "—"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-slate-500">Total estimé</div>
              <div className="mt-1 font-semibold text-slate-900">{total.toFixed(2)} €</div>
            </div>
          </div>
        </div>

        {projectSummary.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Détails du projet</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {projectSummary.map((line, index) => (
                <li key={`${line}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Détail du devis</h2>
            <div className="mt-4 space-y-3">
              {project.items?.length ? (
                project.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <div className="font-medium text-slate-800">{item.product?.name || item.service?.name || "Élément"}</div>
                      <div className="text-xs text-slate-500">{item.quantity} unité(s)</div>
                    </div>
                    <div className="font-semibold text-slate-800">{Number(item.unitPriceHtAtSale || 0).toFixed(2)} €</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Aucun élément n’a encore été ajouté à ce devis.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-rose-900">Refuser le devis</h2>
            <p className="mt-2 text-sm text-rose-700">Sélectionnez une raison et expliquez votre point de vue. Ce retour servira à améliorer les futurs devis.</p>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Raison du refus
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800"
                >
                  {REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Détail de votre raison
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={5}
                  placeholder="Expliquez votre refus pour aider l’IA à analyser le pour et le contre et proposer des solutions de rattrapage."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800"
                />
              </label>

              <button
                onClick={handleReject}
                disabled={submitting}
                className="w-full rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Enregistrement..." : "Refuser le devis"}
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

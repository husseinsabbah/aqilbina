"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ProjectRequestForm from "@/app/client/[id]/ProjectRequestForm";

interface Professional {
  id: string;
  name: string | null;
  companyName: string | null;
  city: string | null;
  trade: string | null;
  role: string;
  certificationScore?: number;
}

// Valeurs par défaut pour le formulaire
const defaultValues = {
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  clientAddress: "",
  projectName: "",
  projectType: "",
  customProjectType: "",
  workType: "",
  description: "",
  solLongueur: "",
  solLargeur: "",
  solSurface: "",
  murLongueur: "",
  murHauteur: "",
  nbMurs: "",
  murSurface: "",
  surface: "",
  budgetEstimate: "",
  specialtyDetails: "",
};

function RechercheContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") || "all";
  const query = searchParams.get("q") || "";

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (type !== "all") params.set("role", type);
        if (query) params.set("q", query);

        const res = await fetch(`/api/public/search?${params.toString()}`);
        if (!res.ok) throw new Error("Erreur lors de la recherche");
        const data = await res.json();

        if (!isActive) return;
        setProfessionals(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        setProfessionals([]);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      isActive = false;
    };
  }, [type, query]);

  const getProfessionalTypeLabel = (value?: string | null) => {
    const normalized = (value || "").toLowerCase();

    if (["vendeur", "seller", "vendor"].some((word) => normalized.includes(word))) return "vendeur";
    if (["usine", "manufacturer", "fabricant", "fournisseur", "supplier"].some((word) => normalized.includes(word))) return "usine";
    if (["artisan", "craftsman", "maitre artisan", "maître artisan"].some((word) => normalized.includes(word))) return "artisan";
    if (["promoteur", "promoter", "developpeur", "constructeur"].some((word) => normalized.includes(word))) return "promoteur";

    return "professionnel";
  };

  const selectedTypeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      all: "professionnel",
      artisan: "artisan",
      vendeur: "vendeur",
      usine: "usine",
      promoteur: "promoteur",
    };

    return labels[type] || getProfessionalTypeLabel(type);
  }, [type]);

  const title = useMemo(() => {
    if (query) {
      return `Résultats pour "${query}"`;
    }
    const labels: Record<string, string> = {
      all: "Tous les professionnels",
      artisan: "Artisans",
      vendeur: "Vendeurs",
      usine: "Usines",
      promoteur: "Promoteurs",
    };
    return labels[type] || "Professionnels";
  }, [type, query]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Titre et résultats */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">
            {professionals.length} résultat{professionals.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Liste des artisans */}
        {professionals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <p className="text-slate-600">Aucun professionnel ne correspond à votre recherche.</p>
            <p className="mt-2 text-sm text-slate-400">
              Essayez de modifier vos critères ou utilisez le formulaire ci-dessous pour lancer une demande à tous.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {professionals.map((pro) => (
              <div
                key={pro.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                      {pro.role || pro.trade || "Professionnel"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {pro.companyName || pro.name || "Non renseigné"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{pro.city || "Ville non renseignée"}</p>
                    {pro.trade && (
                      <p className="mt-2 text-sm text-slate-500">
                        Spécialité : <span className="font-medium text-slate-700">{pro.trade}</span>
                      </p>
                    )}
                  </div>
                  {pro.certificationScore != null && (
                    <div className="flex-shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {pro.certificationScore}%
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/client/${pro.id}`)}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {`Demander un devis à ce ${getProfessionalTypeLabel(pro.role || pro.trade)}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================
            SECTION DEVIS GÉNÉRAL (BROADCAST)
        ============================================================ */}
        <div className="mt-12 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {`📋 Vous ne trouvez pas le bon ${selectedTypeLabel} ?`}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Remplissez le formulaire ci-dessous pour envoyer votre projet à <strong>{`tous les ${selectedTypeLabel === "professionnel" ? "professionnels" : selectedTypeLabel + "s"}`}</strong> correspondant aux métiers que vous sélectionnez.
              <br />
              <span className="text-xs text-slate-500">
                {`Vous pouvez aussi choisir un ${selectedTypeLabel} ci-dessus pour un devis ciblé.`}
              </span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <ProjectRequestForm
              artisanId="broadcast"
              artisanName="tous les professionnels concernés"
              trade={type === "all" ? "general" : type}
              broadcastMode={true}
              professionalLabel={selectedTypeLabel}
              targetRole={type === "all" ? "all" : (type as "artisan" | "vendeur" | "promoteur")}
              defaultValues={defaultValues}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <RechercheContent />
    </Suspense>
  );
}
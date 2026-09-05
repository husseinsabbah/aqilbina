"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

// --- Utilitaires de validation d'URL ---
const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return false;
  return trimmed.startsWith('/') || trimmed.startsWith('http');
};

// --- Types ---
interface Project {
  id: string;
  name: string;
  status: string;
  type?: string | null;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  description?: string;
  analysisResult?: string;
  budgetEstimate?: number | null;
  surface?: number;
  createdAt: string;
  desiredStartDate?: string | null;
  desiredEndDate?: string | null;
  portfolioMedia?: string | string[];
  metadata?: {
    selectedTrades?: string[];
    workType?: string;
    batiment?: string;
    chantiers?: string[];
    pieces?: {
      type: string;
      solSurface: string;
      murSurface: string;
      hauteur: string;
      equipements: string[];
    }[];
    files?: string[];
    details?: Record<string, unknown>;
  };
  vendorProposals?: {
    id: string;
    userId: string;
    quantity: number;
    unitPrice: number;
    message: string | null;
    status: string;
    deliveryDate: string | null;
    createdAt: string;
    user?: {
      id: string;
      name: string | null;
      companyName: string | null;
    };
    product?: {
      id: string;
      name: string;
      salePrice: number;
    };
  }[];
}

interface ProposalItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
}

interface UserService {
  id: string;
  name: string;
  serviceCategory?: string | null;
  unit?: string | null;
  unitPrice: number;
  isActive?: boolean | null;
  applicableProjectTypes?: string | null;
}

interface MatchedService extends UserService {
  score: number;
  quantity: number;
  total: number;
}

export default function ProjectPublicPage() {
  const { data: session } = useSession();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState<string | null>(null);
  const [iaError, setIaError] = useState<string | null>(null);
  const [iaClarification, setIaClarification] = useState("");

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([
    { name: "", quantity: 1, unitPrice: 0, tvaRate: 20 },
  ]);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [proposalMessage, setProposalMessage] = useState("");
  const [sendingProposal, setSendingProposal] = useState(false);

  const user = session?.user;
  const isProfessional = user && (user.role === "artisan" || user.role === "vendeur");
  const [services, setServices] = useState<UserService[]>([]);

  const normalizeText = (value: string | null | undefined) =>
    (value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const matchedServices = useMemo<MatchedService[]>(() => {
    if (!project || services.length === 0) return [];

    const parseProjectTypeTags = (raw: string | null | undefined): string[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((value) => normalizeText(String(value))) : [];
      } catch {
        return [];
      }
    };

    const projectType = normalizeText(project.type || project.metadata?.workType || "");
    const workType = normalizeText(project.metadata?.workType || "");
    const description = normalizeText(
      [
        project.description,
        project.metadata?.batiment,
        project.metadata?.details && typeof project.metadata.details === "object" && "description" in project.metadata.details
          ? String((project.metadata.details as Record<string, unknown>).description ?? "")
          : "",
      ].filter(Boolean).join(" ")
    );

    const pieces = project.metadata?.pieces || [];
    const solSurface = pieces.reduce((sum, piece) => sum + (Number(piece.solSurface) || 0), 0);
    const murSurface = pieces.reduce((sum, piece) => sum + (Number(piece.murSurface) || 0), 0);
    const totalSurface = Number(project.surface || 0) || solSurface + murSurface;
    const selectedTrades = project.metadata?.selectedTrades || [];
    const tradeText = selectedTrades.map((trade) => normalizeText(trade)).join(" ");
    const isBathroom = /salle de bain|sdb|douche|baignoire|sanitaire/.test(`${projectType} ${description}`);
    const isKitchen = /cuisine|credence|evier/.test(`${projectType} ${description}`);

    const scored = services.map((service) => {
      const serviceText = normalizeText(`${service.name} ${service.serviceCategory ?? ""}`);
      const projectTypeTags = parseProjectTypeTags(service.applicableProjectTypes);
      let score = 0;

      if (projectTypeTags.length > 0) {
        if (projectType && projectTypeTags.includes(projectType)) score += 10;
      } else {
        if (projectType && serviceText.includes(projectType)) score += 6;
        if (isBathroom && /salle de bain|sdb|sanitaire|douche/.test(serviceText)) score += 6;
        if (isKitchen && /cuisine|credence|evier/.test(serviceText)) score += 6;
        if (workType && serviceText.includes(workType)) score += 4;
        if (/renovation|renovation complete|preparation/.test(workType) && /renovation|reprise|preparation|demolition|etancheite/.test(serviceText)) score += 3;
        if (/refresh|rafraichissement|support existant/.test(workType) && /pose|finition|reprise/.test(serviceText)) score += 3;
        if (/sol|plancher/.test(serviceText) && solSurface > 0) score += 3;
        if (/mur|paroi|faience/.test(serviceText) && murSurface > 0) score += 3;
      }

      if (tradeText && serviceText.includes(tradeText)) score += 5;
      if (selectedTrades.some((trade) => serviceText.includes(normalizeText(trade)))) score += 4;

      const isWallService = /mur|paroi|faience/.test(serviceText);
      const isFloorService = /sol|plancher/.test(serviceText);
      const quantity = service.unit === "m²"
        ? (isWallService ? murSurface : isFloorService ? solSurface : totalSurface)
        : 1;

      return {
        ...service,
        score,
        quantity: quantity > 0 ? quantity : 0,
        total: quantity > 0 ? service.unitPrice * quantity : 0,
      };
    });

    return scored
      .filter((item) => item.score > 0 && item.quantity > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }, [project, services]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/public`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) {
            setProject(null);
            setMessage("Ce devis n'existe plus ou le lien est invalide.");
            return;
          }
          throw new Error(`Erreur serveur (${res.status})`);
        }
        const data: Project = await res.json();
        setProject(data);
        if (data.analysisResult) {
          setIaResult(data.analysisResult);
        }
      } catch (error) {
        console.error("Erreur chargement projet:", error);
        setProject(null);
        setMessage("Ce projet n'est pas disponible ou le lien est invalide.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchProject();
  }, [projectId]);

  useEffect(() => {
    const loadServices = async () => {
      if (!isProfessional) {
        setServices([]);
        return;
      }

      try {
        const res = await fetch("/api/user/services", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        setServices(Array.isArray(data) ? data.filter((service: UserService) => service.isActive !== false) : []);
      } catch (error) {
        console.error("Erreur chargement services:", error);
        setServices([]);
      }
    };

    void loadServices();
  }, [isProfessional]);

  const handleAnalyzeWithIA = async () => {
    if (!projectId || iaLoading) return;
    setIaLoading(true);
    setIaError(null);
    try {
      const formData = new FormData();
      formData.append("projectId", projectId);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'analyse par l'IA");
      setIaResult(data.devis || data.analysisResult || "Aucun résultat");

      const refreshRes = await fetch(`/api/projects/${projectId}/public`, { credentials: "include" });
      if (refreshRes.ok) {
        const refreshed: Project = await refreshRes.json();
        setProject(refreshed);
        if (refreshed.analysisResult) {
          setIaResult(refreshed.analysisResult);
        }
      }
    } catch (error) {
      console.error("Erreur IA:", error);
      setIaError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIaLoading(false);
    }
  };

  const handleIaClarification = () => {
    const trimmed = iaClarification.trim();
    if (!trimmed) return;

    setIaResult((current) => {
      const initial = current?.trim() || "";
      const responsePrefix = /Je n’ai pas pu analyser ce projet|préciser votre besoin principal/i.test(initial)
        ? "Merci. J’ai complété le besoin principal :"
        : "Réponse complémentaire :";

      return initial
        ? `${initial}\n\n${responsePrefix} ${trimmed}`
        : `${responsePrefix} ${trimmed}`;
    });

    setIaClarification("");
    setIaError(null);
  };

  const handleSendProposal = async () => {
    if (!project || !user) return;

    const validItems = proposalItems.filter(item => item.name.trim() !== "" && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      alert("Ajoutez au moins une ligne de devis valide.");
      return;
    }

    setSendingProposal(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: validItems,
          deliveryDays,
          message: proposalMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi du devis");
      alert("✅ Devis envoyé au client !");
      setShowProposalForm(false);
      setProposalItems([{ name: "", quantity: 1, unitPrice: 0, tvaRate: 20 }]);
      setProposalMessage("");
      const refreshRes = await fetch(`/api/projects/${projectId}/public`, { credentials: "include" });
      if (refreshRes.ok) {
        const refreshed: Project = await refreshRes.json();
        setProject(refreshed);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setSendingProposal(false);
    }
  };

  const addProposalItem = () => {
    setProposalItems([...proposalItems, { name: "", quantity: 1, unitPrice: 0, tvaRate: 20 }]);
  };
  const removeProposalItem = (index: number) => {
    if (proposalItems.length > 1) {
      setProposalItems(proposalItems.filter((_, i) => i !== index));
    }
  };
  const updateProposalItem = (index: number, field: keyof ProposalItem, value: string | number) => {
    const updated = [...proposalItems];
    updated[index] = { ...updated[index], [field]: value };
    setProposalItems(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Chargement du devis...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Devis introuvable</h1>
          <p className="text-slate-600">{message || "Ce devis n'existe plus ou le lien est invalide."}</p>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    BROUILLON: "Brouillon",
    ACTIVE: "Demande active",
    PUBLIE: "Public",
    EN_COURS: "En cours",
    EN_ATTENTE: "En attente",
    NEGOCIATION: "Négociation",
    ACCEPTE: "Projet accepté",
    REFUSE: "Projet refusé",
    TERMINE: "Projet terminé",
    ARCHIVE: "Archivé",
    PENDING: "En attente",
    ACCEPTED: "Accepté",
    REJECTED: "Refusé",
  };

  const statusKey = String(project?.status || "ACTIVE").toUpperCase();
  const uiStatus = statusLabels[statusKey] || "Demande active";

  const selectedTrades = project?.metadata?.selectedTrades || [];

  const rawFiles = project?.metadata?.files;
  const safeFiles = Array.isArray(rawFiles) ? rawFiles.filter(url => isValidUrl(url)) : [];
    const budgetDisplay = project?.budgetEstimate != null && Number(project.budgetEstimate) > 0
    ? `${Number(project.budgetEstimate).toLocaleString("fr-FR")} €`
    : "Budget non renseigné";

  const portfolioMedia = project?.portfolioMedia;
  let portfolioUrls: string[] = [];
  if (portfolioMedia) {
    if (Array.isArray(portfolioMedia)) {
      portfolioUrls = portfolioMedia.filter(url => isValidUrl(url));
    } else if (typeof portfolioMedia === 'string' && isValidUrl(portfolioMedia)) {
      portfolioUrls = [portfolioMedia];
    }
  }

  const pieces = project?.metadata?.pieces || [];
  const chantiers = project?.metadata?.chantiers || [];
  const proposals = project?.vendorProposals || [];

  const tradeColorMap: Record<string, string> = {
    plombier: "bg-blue-100 text-blue-800",
    carreleur: "bg-orange-100 text-orange-800",
    electricien: "bg-yellow-100 text-yellow-800",
    peintre: "bg-pink-100 text-pink-800",
    menuisier: "bg-amber-100 text-amber-800",
    maçon: "bg-red-100 text-red-800",
  };

  const tradeLabelMap: Record<string, string> = {
    plombier: "💧 Plomberie",
    carreleur: "🧱 Carrelage",
    electricien: "⚡ Électricité",
    peintre: "🎨 Peinture",
    menuisier: "🪚 Menuiserie",
    maçon: "🧱 Maçonnerie",
  };

  const isVideo = (url: string) => /\.(mp4|webm|mov|avi|m4v)(\?.*)?$/i.test(url) || /video/i.test(url);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Devis client</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{project.name}</h1>

              {project.metadata?.batiment && (
                <div className="mt-2 text-sm text-slate-600">
                  <span className="font-semibold">Bâtiment :</span> {project.metadata.batiment}
                </div>
              )}

              {selectedTrades.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Métiers nécessaires :</span>
                  {selectedTrades.map((trade) => (
                    <span
                      key={trade}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tradeColorMap[trade] || "bg-gray-100 text-gray-800"}`}
                    >
                      {tradeLabelMap[trade] || trade}
                    </span>
                  ))}
                  {selectedTrades.length > 1 && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                      🔄 Projet multi-métiers
                    </span>
                  )}
                </div>
              )}

              {chantiers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Pièces concernées :</span>
                  {chantiers.map((chantier) => (
                    <span
                      key={chantier}
                      className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                    >
                      {chantier}
                    </span>
                  ))}
                </div>
              )}

              {pieces.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">📐 Détails par pièce</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pieces.map((piece, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                      >
                        <p className="font-semibold text-slate-800">{piece.type}</p>
                        {piece.solSurface && (
                          <p className="text-slate-600">Sol : {piece.solSurface} m²</p>
                        )}
                        {piece.murSurface && (
                          <p className="text-slate-600">Murs : {piece.murSurface} m²</p>
                        )}
                        {piece.hauteur && (
                          <p className="text-slate-600">Hauteur : {piece.hauteur} m</p>
                        )}
                        {piece.equipements && piece.equipements.length > 0 && (
                          <p className="text-slate-600">
                            Équipements : {piece.equipements.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Galerie fichiers sécurisée */}
              {safeFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">📸 Fichiers du chantier</h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {safeFiles.map((url, index) => {
                      const isVideoFile = isVideo(url);
                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:shadow-md"
                        >
                          {isVideoFile ? (
                            <video
                              src={url}
                              className="h-32 w-full object-cover"
                              controls
                              muted
                            />
                          ) : (
                            <Image
                              src={url}
                              alt={`Fichier ${index + 1}`}
                              width={400}
                              height={300}
                              className="h-32 w-full object-cover"
                              unoptimized
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/20">
                            <span className="text-xs font-medium text-white opacity-0 transition hover:opacity-100">
                              🔍 Agrandir
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Portfolio media */}
              {portfolioUrls.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">📸 Portfolio</h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {portfolioUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block overflow-hidden rounded-lg border border-violet-200 bg-violet-50 transition hover:shadow-md"
                      >
                        <Image
                          src={url}
                          alt={`Portfolio ${index + 1}`}
                          width={400}
                          height={300}
                          className="h-32 w-full object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/20">
                          <span className="text-xs font-medium text-white opacity-0 transition hover:opacity-100">
                            🔍 Agrandir
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Informations client + DATES */}
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">Budget estimé :</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    {budgetDisplay}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">Description :</span>
                  <span>{project.description || "—"}</span>
                </div>

                {project.desiredStartDate && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">Début souhaité :</span>
                    <span>{new Date(project.desiredStartDate).toLocaleDateString("fr-FR")}</span>
                  </div>
                )}
                {project.desiredEndDate && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">Fin souhaitée :</span>
                    <span>{new Date(project.desiredEndDate).toLocaleDateString("fr-FR")}</span>
                  </div>
                )}

                {project.clientPhone && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">Téléphone :</span>
                    <span>{project.clientPhone}</span>
                  </div>
                )}
                {project.clientEmail && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">E-mail :</span>
                    <span>{project.clientEmail}</span>
                  </div>
                )}
                {project.clientAddress && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">Adresse :</span>
                    <span>{project.clientAddress}</span>
                  </div>
                )}

                {project.surface != null && project.surface > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">Surface totale :</span>
                    <span>{project.surface} m²</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">Client :</span>
                  <span>{project.clientName || "Non renseigné"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">Créé le :</span>
                  <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString("fr-FR") : "Date non renseignée"}</span>
                </div>
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-sm font-medium ${statusKey === "ARCHIVE" || statusKey === "REFUSE" ? "bg-slate-200 text-slate-800" : "bg-amber-100 text-amber-900"}`}>
              Statut : {uiStatus}
            </div>
          </div>
        </div>

        {/* Préparation du devis */}
        {isProfessional && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                🧾 Préparer le devis
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                Contexte du projet
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-white p-3 border border-emerald-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Budget</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{budgetDisplay}</p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Type</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{project.type || project.metadata?.workType || "Non renseigné"}</p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Surface</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{project.surface ? `${project.surface} m²` : "Non renseignée"}</p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Dates</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {project.desiredStartDate || project.desiredEndDate
                    ? [project.desiredStartDate ? new Date(project.desiredStartDate).toLocaleDateString("fr-FR") : "—", project.desiredEndDate ? new Date(project.desiredEndDate).toLocaleDateString("fr-FR") : "—"].join(" → ")
                    : "Non renseignées"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white p-3 border border-emerald-100">
              <p className="text-xs uppercase tracking-wide text-slate-500">Besoin principal</p>
              <p className="mt-2 text-sm text-slate-700">
                {project.description || "Aucune description détaillée fournie pour le moment."}
              </p>
            </div>
          </div>
        )}

        {/* Bloc IA */}
        {isProfessional && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                🤖 Assistant IA
              </h3>
              {!iaResult && (
                <button
                  onClick={handleAnalyzeWithIA}
                  disabled={iaLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {iaLoading ? "Analyse en cours..." : "Générer un pré-devis avec l'IA"}
                </button>
              )}
              {iaResult && (
                <button
                  onClick={() => { setIaResult(null); setIaError(null); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {iaLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-700">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></span>
                {"L'IA analyse les photos et les données du projet..."}
              </div>
            )}

            {iaError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Erreur : {iaError}
              </div>
            )}

            {iaResult && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-white p-4 text-sm text-slate-700">
                <div className="mb-2 font-semibold text-slate-900">Pré-devis IA :</div>
                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{iaResult}</div>
              </div>
            )}

            {(iaResult && /Je n’ai pas pu analyser ce projet|préciser votre besoin principal/i.test(iaResult)) && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 text-sm font-semibold text-amber-900">
                  Besoin de précision pour l’IA
                </div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-amber-800">
                  Décrivez le besoin principal du chantier
                </label>
                <textarea
                  value={iaClarification}
                  onChange={(event) => setIaClarification(event.target.value)}
                  rows={3}
                  placeholder="Ex. : remplacement de la salle de bain, pose de carrelage sur sol et murs, budget 5000 €..."
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleIaClarification}
                    disabled={!iaClarification.trim()}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Envoyer la précision
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prestations recommandées */}
        {isProfessional && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
              🔧 Prestations recommandées
            </h3>

            {matchedServices.length === 0 ? (
              <p className="mt-3 text-sm text-indigo-700">
                Aucune prestation ne correspond automatiquement à cette demande pour le moment.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {matchedServices.map((service) => (
                  <div key={service.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{service.name}</p>
                        <p className="text-xs text-slate-500">
                          {service.serviceCategory || "Prestation"} · quantité: {service.quantity.toFixed(2)} {service.unit || "m²"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{Number(service.unitPrice || 0).toFixed(2)} € / {service.unit || "m²"}</p>
                        <p className="font-semibold text-indigo-900">{service.total.toFixed(2)} €</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Devis reçus */}
        {proposals.length > 0 && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-purple-700">
              📋 Devis reçus ({proposals.length})
            </h3>
            <div className="mt-4 space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {proposal.user?.companyName || proposal.user?.name || "Artisan"}
                      </p>
                      <p className="text-sm text-slate-600">{proposal.message || "Aucun message"}</p>
                      {proposal.deliveryDate && (
                        <p className="text-xs text-slate-500">
                          Livraison prévue : {new Date(proposal.deliveryDate).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                      proposal.status === "EN_ATTENTE" ? "bg-yellow-100 text-yellow-800" :
                      proposal.status === "ACCEPTE" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {proposal.status === "EN_ATTENTE" ? "En attente" :
                       proposal.status === "ACCEPTE" ? "Accepté" : "Refusé"}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between border-b border-slate-100 py-1">
                      <span>Quantité</span>
                      <span>{proposal.quantity}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-1">
                      <span>Prix unitaire</span>
                      <span>{proposal.unitPrice.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2">
                      <span>Total</span>
                      <span>{(proposal.quantity * proposal.unitPrice).toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton "Envoyer un devis" */}
        {isProfessional && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                📋 Répondre à cette demande
              </h3>
              <button
                onClick={() => setShowProposalForm(!showProposalForm)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {showProposalForm ? "Fermer le devis" : "Envoyer un devis"}
              </button>
            </div>

            {showProposalForm && (
              <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
                <h4 className="mb-3 font-semibold text-slate-900">Détail du devis</h4>

                {proposalItems.map((item, index) => (
                  <div key={index} className="mb-3 grid grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
                    <div className="col-span-5">
                      <label className="block text-xs font-semibold text-slate-600">Description</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateProposalItem(index, "name", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        placeholder="Ex: Carrelage sol"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600">Qté</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateProposalItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600">Prix unit.</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateProposalItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        placeholder="€"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600">TVA</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.tvaRate}
                        onChange={(e) => updateProposalItem(index, "tvaRate", parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        placeholder="%"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeProposalItem(index)}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        disabled={proposalItems.length <= 1}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addProposalItem}
                  className="mb-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Ajouter une ligne
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Délai (jours)</label>
                    <input
                      type="number"
                      min="1"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Message au client</label>
                    <input
                      type="text"
                      value={proposalMessage}
                      onChange={(e) => setProposalMessage(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      placeholder="Votre message..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendProposal}
                  disabled={sendingProposal}
                  className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sendingProposal ? "Envoi en cours..." : "Envoyer le devis au client"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
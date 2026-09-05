"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle, Loader2, Printer, Send, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type ProjectDetails = {
  description?: string | null;
  projectType?: string | null;
  workType?: string | null;
  sol?: {
    longueur?: number | null;
    largeur?: number | null;
    surface?: number | null;
  } | null;
  mur?: {
    nbMurs?: number | null;
    longueur?: number | null;
    hauteur?: number | null;
    surface?: number | null;
    walls?: Array<{
      index?: number;
      longueur?: number | null;
      hauteur?: number | null;
      grossSurface?: number | null;
      openingsSurface?: number | null;
      surface?: number | null;
      openings?: Array<{
        type?: string | null;
        largeur?: number | null;
        hauteur?: number | null;
        quantite?: number | null;
        surface?: number | null;
      }>;
    }>;
  } | null;
  specialtyDetails?: string | null;
  products?: {
    activeTrades?: string[];
    selected?: Array<{
      name?: string;
      brand?: string | null;
      category?: string;
      quantity?: number;
      salePrice?: number;
      trade?: string;
      seller?: string;
    }>;
  } | null;
};

type UserService = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  serviceCategory?: string | null;
  isActive?: boolean;
  applicableProjectTypes?: string | null;
};

type MatchedService = UserService & {
  quantity: number;
  total: number;
};

type RequestRecipient = {
  id: string;
  status: string;
  trade: string;
  message: string | null;
  project: {
    id: string;
    name: string;
    description: string | null;
    type: string | null;
    surface: number | null;
    budgetEstimate: number | null;
    metadata?: Record<string, unknown> | null;
    sharePublicUrl: string | null;
    projectAccessPin: string | null;
    clientName: string | null;
    clientAddress: string | null;
    status: string;
    createdAt: string;
  };
};

type AiAnalysis = {
  summary: string;
  nextAction: string;
  questions: string[];
  recommendedProducts: Array<{
    productId: string;
    name: string;
    brand?: string | null;
    price?: number;
    stock?: number;
    quantity?: number;
    justification?: string;
  }>;
  recommendedTutorials?: Array<{
    tutorialId: string;
    title: string;
    type: string;
    url: string;
    description: string;
  }>;
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

export default function ArtisanRequestsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [requests, setRequests] = useState<RequestRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<UserService[]>([]);
  const [openQuoteFor, setOpenQuoteFor] = useState<string | null>(null);
  const [quoteMessages, setQuoteMessages] = useState<Record<string, string>>({});
  const [aiAnalysisByRequest, setAiAnalysisByRequest] = useState<Record<string, AiAnalysis>>({});
  const [aiLoadingByRequest, setAiLoadingByRequest] = useState<Record<string, boolean>>({});

  const parseDetails = (rawDescription: string | null): ProjectDetails | null => {
    if (!rawDescription) return null;

    try {
      const parsed = JSON.parse(rawDescription);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as ProjectDetails;
    } catch {
      return null;
    }
  };

  const normalizeText = (value: string | null | undefined) => (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const getMatchedServices = (project: RequestRecipient['project'], details: ProjectDetails | null): MatchedService[] => {
    const projectType = normalizeText(details?.projectType || project.type);
    const workType = normalizeText(details?.workType);
    const description = normalizeText([
      details?.description,
      details?.specialtyDetails,
      project.name,
      project.description,
    ].filter(Boolean).join(' '));
    const solSurface = Number(details?.sol?.surface || 0);
    const murSurface = Number(details?.mur?.surface || 0);
    const totalSurface = Number(project.surface || 0) || solSurface + murSurface;
    const isBathroom = /salle de bain|sdb|douche|baignoire|sanitaire/.test(`${projectType} ${description}`);
    const isKitchen = /cuisine|credence|evier/.test(`${projectType} ${description}`);

    const parseProjectTypeTags = (raw: string | null | undefined): string[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((value) => normalizeText(String(value))) : [];
      } catch {
        return [];
      }
    };

    const scored = services.map((service) => {
      const serviceText = normalizeText(`${service.name} ${service.serviceCategory}`);
      const projectTypeTags = parseProjectTypeTags(service.applicableProjectTypes);
      let score = 0;

      if (projectTypeTags.length > 0) {
        // Prestation taguée explicitement : correspondance exacte au type de projet, sinon on l'exclut.
        if (projectType && projectTypeTags.includes(projectType)) score += 10;
      } else {
        // Prestation non taguée (ancienne saisie) : on garde l'ancienne logique approximative, sans repli générique.
        if (projectType && serviceText.includes(projectType)) score += 6;
        if (isBathroom && /salle de bain|sdb|sanitaire|douche/.test(serviceText)) score += 6;
        if (isKitchen && /cuisine|credence|evier/.test(serviceText)) score += 6;
        if (workType && serviceText.includes(workType)) score += 4;
        if (/renovation|renovation complete|preparation/.test(workType) && /renovation|reprise|preparation|demolition|etancheite/.test(serviceText)) score += 3;
        if (/refresh|rafraichissement|support existant/.test(workType) && /pose|finition|reprise/.test(serviceText)) score += 3;
        if (/sol|plancher/.test(serviceText) && solSurface > 0) score += 3;
        if (/mur|paroi|faience/.test(serviceText) && murSurface > 0) score += 3;
      }

      const isWallService = /mur|paroi|faience/.test(serviceText);
      const isFloorService = /sol|plancher/.test(serviceText);
      const quantity = service.unit === 'm²'
        ? (isWallService ? murSurface : isFloorService ? solSurface : totalSurface)
        : 1;

      return { service, score, quantity, total: service.unitPrice * quantity };
    });

    const matching = scored
      .filter((item) => item.score > 0 && item.quantity > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 6);

    return matching.map(({ service, quantity, total }) => ({ ...service, quantity, total }));
  };

  const loadRequests = async () => {
    try {
      const response = await fetch("/api/artisan/requests", { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de charger les demandes.");
      setRequests(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user?.id) {
      router.push("/auth/signin");
      return;
    }

    let isMounted = true;

    const fetchRequests = async () => {
      try {
        const response = await fetch("/api/artisan/requests", { credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Impossible de charger les demandes.");
        if (isMounted) {
          setRequests(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Erreur de chargement.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchRequests();

    return () => {
      isMounted = false;
    };
  }, [router, session, sessionStatus]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch("/api/user/services", { credentials: "include" });
        const data = await response.json().catch(() => []);
        if (!response.ok) return;

        const list = Array.isArray(data) ? data : [];
        setServices(list.filter((service: UserService) => service.isActive !== false));
      } catch {
        setServices([]);
      }
    };

    if (session?.user?.id) {
      void loadServices();
    }
  }, [session?.user?.id]);

  const loadAiAnalysis = async (requestItem: RequestRecipient) => {
    const existing = aiAnalysisByRequest[requestItem.id];
    if (existing) return existing;

    setAiLoadingByRequest((current) => ({ ...current, [requestItem.id]: true }));

    try {
      const response = await fetch('/api/agent/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: requestItem.project.id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Impossible de charger l’analyse IA.');
      }

      const analysis: AiAnalysis = {
        summary: typeof data.summary === 'string' ? data.summary : 'Analyse en cours pour ce projet.',
        nextAction: typeof data.nextAction === 'string' ? data.nextAction : 'Valider les recommandations IA avant envoi.',
        questions: Array.isArray(data.questions) ? data.questions.filter((item): item is string => typeof item === 'string') : [],
        recommendedProducts: Array.isArray(data.recommendedProducts)
          ? data.recommendedProducts.map((item: Record<string, unknown>) => ({
              productId: String(item.productId ?? ''),
              name: String(item.name ?? 'Produit recommandé'),
              brand: typeof item.brand === 'string' ? item.brand : null,
              price: Number(item.price ?? 0),
              stock: Number(item.stock ?? 0),
              quantity: Number(item.quantity ?? 1),
              justification: typeof item.justification === 'string' ? item.justification : '',
            }))
          : [],
        recommendedTutorials: Array.isArray(data.recommendedTutorials)
          ? data.recommendedTutorials.map((item: Record<string, unknown>) => ({
              tutorialId: String(item.tutorialId ?? ''),
              title: String(item.title ?? 'Tutoriel'),
              type: String(item.type ?? 'link'),
              url: String(item.url ?? ''),
              description: String(item.description ?? ''),
            }))
          : [],
      };

      setAiAnalysisByRequest((current) => ({ ...current, [requestItem.id]: analysis }));
      return analysis;
    } catch (error) {
      console.error('AI analyze error', error);
      const fallback: AiAnalysis = {
        summary: 'L’analyse IA n’a pas pu être complétée. Vérifiez les informations de la demande.',
        nextAction: 'Compléter les informations manquantes puis relancer l’analyse.',
        questions: ['Quels sont les matériaux ou finitions prioritaires ?', 'Quel est le budget maximum ?', 'Y a-t-il des contraintes de chantier ?',],
        recommendedProducts: [],
        recommendedTutorials: [],
      };
      setAiAnalysisByRequest((current) => ({ ...current, [requestItem.id]: fallback }));
      return fallback;
    } finally {
      setAiLoadingByRequest((current) => ({ ...current, [requestItem.id]: false }));
    }
  };

  const buildProposalItems = (requestItem: RequestRecipient, matchedServices: MatchedService[]) => {
    if (!matchedServices.length) {
      return [] as Array<{ name: string; quantity: number; unitPrice: number }>;
    }

    return matchedServices.map((service) => ({
      name: service.name,
      quantity: Number(service.quantity) || 0,
      unitPrice: Number(service.unitPrice) || 0,
    }));
  };

  const sendProposal = async (requestItem: RequestRecipient, matchedServices: MatchedService[]) => {
    const items = buildProposalItems(requestItem, matchedServices);

    if (!items.length) {
      setError("Aucune prestation n’est disponible pour construire un devis sur cette demande.");
      return;
    }

    setQuoteLoading(requestItem.id);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${requestItem.project.id}/proposals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          deliveryDays: 7,
          message: quoteMessages[requestItem.id] || "",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d’envoyer le devis.");

      await updateStatus(requestItem, "CANDIDAT");
      setOpenQuoteFor(null);
      setQuoteMessages((current) => ({ ...current, [requestItem.id]: "" }));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Erreur lors de l’envoi du devis.");
    } finally {
      setQuoteLoading(null);
    }
  };

  const updateStatus = async (requestItem: RequestRecipient, nextStatus: "CANDIDAT" | "REFUSE") => {
    setActionLoading(requestItem.id);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${requestItem.project.id}/recipients`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: requestItem.id, status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de mettre à jour la demande.");
      await loadRequests();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erreur de mise à jour.");
    } finally {
      setActionLoading(null);
    }
  };

  const exportQuotePdf = (requestItem: RequestRecipient, matchedServices: MatchedService[]) => {
    const total = matchedServices.reduce((sum, service) => sum + service.total, 0);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
      setError("Le navigateur a bloqué la fenêtre d’impression. Veuillez autoriser les pop-ups.");
      return;
    }

    const lines = matchedServices.length > 0
      ? matchedServices.map((service) => `
          <tr>
            <td>${service.name}</td>
            <td>${service.quantity.toFixed(2)} ${service.unit}</td>
            <td>${service.unitPrice.toFixed(2)} €</td>
            <td>${service.total.toFixed(2)} €</td>
          </tr>
        `).join("")
      : '<tr><td colspan="4">Aucune prestation</td></tr>';

    const message = quoteMessages[requestItem.id] || "Merci pour votre confiance. Nous restons à votre disposition pour la suite du projet.";

    printWindow.document.write(`
      <html>
        <head>
          <title>Devis - ${requestItem.project.name}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { font-size: 28px; margin-bottom: 8px; }
            .meta { color: #4b5563; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            th { background: #f3f4f6; }
            .total { margin-top: 18px; font-size: 20px; font-weight: 700; }
            .message { margin-top: 24px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Devis ${requestItem.project.name}</h1>
          <div class="meta">Client: ${requestItem.project.clientName || "Non renseigné"} · Type: ${requestItem.project.type || "Demande de devis"}</div>
          <table>
            <thead>
              <tr>
                <th>Prestation</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
          <div class="total">Total estimé: ${total.toFixed(2)} €</div>
          <div class="message"><strong>Message au client</strong><br />${message.replace(/\n/g, "<br />")}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const shareQuoteWhatsApp = (requestItem: RequestRecipient, matchedServices: MatchedService[]) => {
    const total = matchedServices.reduce((sum, service) => sum + service.total, 0);
    const message = quoteMessages[requestItem.id] || "Bonjour, voici le devis estimé pour votre projet.";
    const text = encodeURIComponent(
      `Bonjour ${requestItem.project.clientName || "client"},\n\nVoici le devis préparé pour votre demande : ${requestItem.project.name}\nTotal estimé : ${total.toFixed(2)} €\n\n${message}`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const shareQuoteByEmail = (requestItem: RequestRecipient, matchedServices: MatchedService[]) => {
    const total = matchedServices.reduce((sum, service) => sum + service.total, 0);
    const subject = encodeURIComponent(`Devis - ${requestItem.project.name}`);
    const body = encodeURIComponent(
      `Bonjour ${requestItem.project.clientName || ""},\n\nVoici le devis préparé pour votre projet.\n\nProjet : ${requestItem.project.name}\nTotal estimé : ${total.toFixed(2)} €\n\nMessage : ${quoteMessages[requestItem.id] || "Merci pour votre confiance."}`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (loading || sessionStatus === "loading") {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Espace artisan</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Demandes de devis reçues</h1>
            <p className="mt-2 text-gray-600">Répondez aux demandes correspondant à votre spécialité.</p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">Aucune demande reçue pour le moment.</div>
          ) : (
            <div className="space-y-4">
              {requests.map((requestItem) => {
                const project = requestItem.project;
                const metadata = (project.metadata as Record<string, unknown> | null) ?? {};
                const details = parseDetails(project.description) ?? {
                  projectType: typeof metadata.projectType === "string" ? metadata.projectType : null,
                  workType: typeof metadata.workType === "string" ? metadata.workType : null,
                };
                const metadataBudgetValue = typeof metadata.budgetEstimate === "number"
                  ? metadata.budgetEstimate
                  : typeof metadata.budgetEstimate === "string"
                    ? Number(metadata.budgetEstimate)
                    : null;
                const clientBudget = project.budgetEstimate ?? metadataBudgetValue;
                const estimatedProjectType = details?.projectType || project.type || "Non précisé";
                const estimatedWorkType = details?.workType || (typeof metadata.workType === "string" ? metadata.workType : "Non précisé");
                const canRespond = ["INVITE", "VUE"].includes(requestItem.status);
                const isBusy = actionLoading === requestItem.id;
                const selectedProducts = details?.products?.selected || [];
                const totalProductsPrice = selectedProducts.reduce((sum, product) => sum + ((product.salePrice || 0) * (product.quantity || 0)), 0);
                const matchedServices = getMatchedServices(project, details);
                const totalServicesPrice = matchedServices.reduce((sum, service) => sum + service.total, 0);

                return (
                  <article key={requestItem.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">{statusLabels[requestItem.status] || requestItem.status}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">{project.type || "Demande de devis"} · spécialité {requestItem.trade}</p>
                      </div>
                      <p className="text-sm text-gray-500">{new Date(project.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Client</span><p className="mt-1">{project.clientName || "Non renseigné"}</p></div>
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Adresse</span><p className="mt-1">{project.clientAddress || "Non renseignée"}</p></div>
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Type projet</span><p className="mt-1">{estimatedProjectType}</p></div>
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Type chantier</span><p className="mt-1">{estimatedWorkType || "Non précisé"}</p></div>
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Surface totale</span><p className="mt-1">{project.surface ? `${project.surface} m²` : "Non renseignée"}</p></div>
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Budget client</span><p className="mt-1">{clientBudget ? `${clientBudget} €` : "Non renseigné"}</p></div>
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Etat</span><p className="mt-1">{statusLabels[requestItem.status] || requestItem.status}</p></div>
                      <div className="rounded-xl bg-gray-50 p-3"><span className="font-semibold text-gray-900">Specialite</span><p className="mt-1">{requestItem.trade || "-"}</p></div>
                    </div>

                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
                      <span className="font-semibold text-blue-900">URL client</span>
                      <a
                        href={project.sharePublicUrl || `/projets/${project.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block break-all font-medium text-blue-700 underline"
                      >
                        {project.sharePublicUrl || `/projets/${project.id}`}
                      </a>
                    </div>

                    {(details?.sol || details?.mur) && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Dimensions chantier</h3>
                        <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                          <div className="rounded-lg bg-white p-3">
                            <p className="font-semibold text-slate-900">Sol</p>
                            <p className="mt-1">Longueur: {details?.sol?.longueur ?? "-"} m</p>
                            <p>Largeur: {details?.sol?.largeur ?? "-"} m</p>
                            <p>Surface: {details?.sol?.surface ?? "-"} m²</p>
                          </div>

                          <div className="rounded-lg bg-white p-3">
                            <p className="font-semibold text-slate-900">Mur</p>
                            <p className="mt-1">Nombre de murs: {details?.mur?.nbMurs ?? "-"}</p>
                            {details?.mur?.longueur && details?.mur?.hauteur ? (
                              <>
                                <p>Longueur: {details.mur.longueur} m</p>
                                <p>Hauteur: {details.mur.hauteur} m</p>
                              </>
                            ) : null}
                            <p>Surface: {details?.mur?.surface ?? "-"} m²</p>
                          </div>
                        </div>

                        {Array.isArray(details?.mur?.walls) && details.mur.walls.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {details.mur.walls.map((wall, idx) => (
                              <div key={`${project.id}-wall-${idx}`} className="rounded-lg bg-white p-3 text-xs text-slate-700">
                                <p className="font-semibold text-slate-900">Mur {wall.index || idx + 1}</p>
                                <p className="mt-1">Surface brute: {wall.grossSurface ?? "-"} m² · Ouvertures: {wall.openingsSurface ?? "0"} m² · Surface nette: {wall.surface ?? "-"} m²</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {details?.specialtyDetails && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Détails métier</p>
                        <p className="mt-2 whitespace-pre-wrap">{details.specialtyDetails}</p>
                      </div>
                    )}

                    {details?.description && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Description du chantier</p>
                        <p className="mt-2 whitespace-pre-wrap">{details.description}</p>
                      </div>
                    )}

                    {selectedProducts.length > 0 && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-emerald-800">Produits demandés par le client</h3>
                        <div className="mt-3 space-y-2">
                          {selectedProducts.map((product, idx) => (
                            <div key={`${project.id}-product-${idx}`} className="flex flex-col gap-1 rounded-lg bg-white p-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{product.name || "Produit"}</p>
                                <p className="text-xs text-slate-500">{product.category || "-"}{product.brand ? ` · ${product.brand}` : ""}{product.trade ? ` · ${product.trade}` : ""}</p>
                              </div>
                              <div className="text-xs text-slate-600 sm:text-right">
                                <p>Quantité: {product.quantity ?? 0}</p>
                                <p>Prix unitaire: {product.salePrice ? `${product.salePrice.toFixed(2)} €` : "-"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-emerald-900">Total produits estimé: {totalProductsPrice > 0 ? `${totalProductsPrice.toFixed(2)} €` : "-"}</p>
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-blue-800">Prix de prestation (avant validation)</h3>
                      {services.length === 0 ? (
                        <p className="mt-2 text-sm text-blue-700">Aucun tarif actif configuré dans votre espace artisan.</p>
                      ) : matchedServices.length === 0 ? (
                        <p className="mt-2 text-sm text-blue-700">Aucune prestation ne correspond automatiquement au projet et à ses dimensions. Vérifiez vos prestations dans Paramètres.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {matchedServices.map((service) => (
                            <div key={`${project.id}-${service.id}`} className="flex items-center justify-between rounded-lg bg-white p-3 text-sm text-slate-700">
                              <div>
                                <p className="font-semibold text-slate-900">{service.name}</p>
                                <p className="text-xs text-slate-500">{service.serviceCategory || "Prestation"} · quantité: {service.quantity.toFixed(2)} {service.unit}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">{service.unitPrice.toFixed(2)} € × {service.quantity.toFixed(2)} {service.unit}</p>
                                <p className="font-semibold text-blue-900">{service.total.toFixed(2)} €</p>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t border-blue-200 pt-3 text-sm font-bold text-blue-900">
                            <span>Total prestations estimé</span>
                            <span>{totalServicesPrice.toFixed(2)} €</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {canRespond && (
                      <div className="mt-5 space-y-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              const nextOpen = openQuoteFor === requestItem.id ? null : requestItem.id;
                              setOpenQuoteFor(nextOpen);
                              if (nextOpen) {
                                await loadAiAnalysis(requestItem);
                              }
                            }}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Préparer le devis
                          </button>
                        </div>

                        {openQuoteFor === requestItem.id && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Préparer le devis</p>
                                <h3 className="mt-1 text-lg font-bold text-emerald-900">Devis en préparation</h3>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800">{matchedServices.length} prestation{matchedServices.length > 1 ? "s" : ""}</span>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.5fr]">
                              <div className="space-y-4">
                                <div className="rounded-2xl border border-white/80 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Demande client</p>
                                  <h4 className="mt-2 text-base font-bold text-slate-900">{project.name}</h4>
                                  <p className="mt-2 text-sm text-slate-600">{project.description || "Aucune description détaillée fournie."}</p>
                                </div>

                                <div className="rounded-2xl border border-white/80 bg-white p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Analyse IA</p>
                                    {aiLoadingByRequest[requestItem.id] && (
                                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                    )}
                                  </div>
                                  <div className="mt-3 space-y-3">
                                    <div>
                                      <p className="text-xs font-medium text-slate-500">Besoin principal</p>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">
                                        {aiAnalysisByRequest[requestItem.id]?.summary || project.type || "Projet de rénovation / travaux"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-slate-500">Points à valider</p>
                                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                        {(aiAnalysisByRequest[requestItem.id]?.questions?.length
                                          ? aiAnalysisByRequest[requestItem.id].questions
                                          : [
                                              'Budget du client et délai souhaité',
                                              'Matériaux et finitions demandées',
                                              'Accès au chantier et contraintes techniques',
                                            ]
                                        ).map((question) => (
                                          <li key={`${requestItem.id}-${question}`}>{question}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="rounded-xl bg-emerald-50 p-3">
                                      <p className="text-xs font-medium text-emerald-700">Suggestion IA</p>
                                      <p className="mt-1 text-sm font-semibold text-emerald-900">
                                        {aiAnalysisByRequest[requestItem.id]?.nextAction || 'Devis en 3 lots avec estimation de chantier et conditions de paiement claires.'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-white/80 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Livrables & planning</p>
                                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                      <span>Livrables</span>
                                      <span className="font-semibold text-slate-900">{Math.max(1, aiAnalysisByRequest[requestItem.id]?.recommendedProducts?.length || 1)} lots</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                      <span>Délai estimé</span>
                                      <span className="font-semibold text-slate-900">7 jours</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                      <span>Budget conseillé</span>
                                      <span className="font-semibold text-slate-900">{matchedServices.reduce((sum, service) => sum + service.total, 0).toFixed(2)} €</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="rounded-2xl border border-white/80 bg-white p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Préparation du devis</p>
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Total {matchedServices.reduce((sum, service) => sum + service.total, 0).toFixed(2)} €</span>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    {(aiAnalysisByRequest[requestItem.id]?.recommendedProducts?.length
                                      ? aiAnalysisByRequest[requestItem.id].recommendedProducts
                                      : matchedServices.map((service) => ({
                                          name: service.name,
                                          quantity: service.quantity,
                                          price: service.unitPrice,
                                          justification: service.serviceCategory || 'Prestation',
                                        }))
                                    ).map((item, index) => (
                                      <div key={`${requestItem.id}-ai-item-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                        <div className="min-w-0">
                                          <p className="font-semibold text-slate-900">{item.name}</p>
                                          <p className="mt-1 text-xs text-slate-500">{item.justification || 'Produit recommandé'} · {Number(item.quantity ?? 1).toFixed(2)} unité(s)</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs text-slate-500">{Number(item.price ?? 0).toFixed(2)} € / unité</p>
                                          <p className="mt-1 font-bold text-emerald-900">{((Number(item.price ?? 0) * Number(item.quantity ?? 1))).toFixed(2)} €</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-white/80 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Conditions du devis</p>
                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <label className="text-xs font-medium text-slate-500">Délai de réalisation</label>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">7 jours</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <label className="text-xs font-medium text-slate-500">Paiement</label>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">50 % à la commande</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <label className="text-xs font-medium text-slate-500">Validité</label>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">30 jours</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <label className="text-xs font-medium text-slate-500">Garantie</label>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">12 mois</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-white/80 bg-white p-4">
                                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    Message au client
                                  </label>
                                  <textarea
                                    value={quoteMessages[requestItem.id] || ""}
                                    onChange={(event) => setQuoteMessages((current) => ({ ...current, [requestItem.id]: event.target.value }))}
                                    rows={4}
                                    className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white"
                                    placeholder="Décrivez votre offre, le délai et les conditions..."
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-100/40 p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Actions rapides</p>
                                  <p className="mt-1 text-xl font-bold text-emerald-900">Total final : {matchedServices.reduce((sum, service) => sum + service.total, 0).toFixed(2)} €</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => exportQuotePdf(requestItem, matchedServices)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    <Printer className="h-4 w-4" />
                                    Prévisualiser PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareQuoteWhatsApp(requestItem, matchedServices)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                                  >
                                    <Send className="h-4 w-4" />
                                    Envoyer par WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareQuoteByEmail(requestItem, matchedServices)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                                  >
                                    <Send className="h-4 w-4" />
                                    Envoyer par e-mail
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => sendProposal(requestItem, matchedServices)}
                                    disabled={quoteLoading === requestItem.id || isBusy}
                                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                                  >
                                    {quoteLoading === requestItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                    Envoyer le devis
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(requestItem, "REFUSE")}
                                    disabled={isBusy}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                  >
                                    <XCircle className="h-4 w-4" /> Refuser
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

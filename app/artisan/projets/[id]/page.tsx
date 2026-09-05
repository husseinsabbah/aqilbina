"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle, XCircle, Loader2, ArrowLeft,
  Sparkles
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

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

const normalizeProjectDescription = (value: string | null | undefined) => {
  if (!value) return { description: '', solSurface: null, murSurface: null };

  const raw = String(value).trim();
  if (!raw) return { description: '', solSurface: null, murSurface: null };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
      const solSurface = typeof parsed.sol?.surface === 'number' ? parsed.sol.surface : null;
      const murSurface = typeof parsed.mur?.surface === 'number' ? parsed.mur.surface : null;

      return {
        description,
        solSurface: solSurface !== null && Number(solSurface) > 0 ? Number(solSurface) : null,
        murSurface: murSurface !== null && Number(murSurface) > 0 ? Number(murSurface) : null,
      };
    }
  } catch {
    return { description: raw, solSurface: null, murSurface: null };
  }

  return { description: raw, solSurface: null, murSurface: null };
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [userPermission, setUserPermission] = useState<'READ' | 'COMMENT' | 'EDIT' | 'VALIDATE' | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const projectSummary = normalizeProjectDescription(project?.description);
  const canEditProject = userPermission === 'EDIT' || userPermission === 'VALIDATE';
  const canValidateProject = userPermission === 'VALIDATE';
  const canManageProjectAccess = !!session?.user?.id && project?.userId === session.user.id;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [clientProvidedItems, setClientProvidedItems] = useState<Record<string, boolean>>({});
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [projectRecommendations, setProjectRecommendations] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [teamAccesses, setTeamAccesses] = useState<any[]>([]);
  const [teamAccessForm, setTeamAccessForm] = useState({ teamId: '', permission: 'READ' });
  const [projectForm, setProjectForm] = useState<any>({
    startDate: '',
    endDate: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientFeedbackStatus: 'PENDING',
    clientFeedbackMessage: '',
    sharePublicUrl: '',
    projectProgressMedia: [] as string[],
    portfolioMedia: [],
    portfolioRating: '',
    portfolioReview: '',
    clientBudgetMax: '',
    depositAmount: '',
    depositPercent: '',
    depositProofUrl: '',
    depositValidated: false,
    handoffStatus: 'none',
    handoffTargetFamily: 'vendeur',
    handoffMessage: '',
  });
  const [discountFinalPrice, setDiscountFinalPrice] = useState<string>('');

  const openDiscountResponse = (type: 'accept' | 'refuse', finalPrice?: string) => {
    const baseUrl = projectForm.sharePublicUrl || `/projets/${projectId}`;
    const params = new URLSearchParams();

    if (type === 'accept') {
      const priceValue = finalPrice && Number(finalPrice) > 0 ? Number(finalPrice).toFixed(2) : '0.00';
      params.set('artisanAction', 'final-price');
      params.set('artisanFinalPrice', priceValue);
      params.set('artisanMessage', `Voici le prix final non négociable : ${priceValue} €.`);
    } else {
      params.set('artisanAction', 'refused');
      params.set('artisanMessage', 'Je vous remercie pour votre demande mais malheureusement je ne peux pas accéder à votre requête. Nous ferons de notre possible pour vous offrir le meilleur travail possible.');
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    const targetUrl = `${baseUrl}${separator}${params.toString()}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const parseMediaList = (value: string | string[] | null | undefined) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // no-op
    }

    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const uploadProgressMedia = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: form,
          credentials: 'include',
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload impossible');
        uploadedUrls.push(data.url);
      }

      setProjectForm((prev: any) => ({
        ...prev,
        projectProgressMedia: [...parseMediaList(prev.projectProgressMedia), ...uploadedUrls],
      }));

      alert(`${uploadedUrls.length} média${uploadedUrls.length > 1 ? 'x' : ''} ajouté${uploadedUrls.length > 1 ? 's' : ''} avec succès`);
    } catch (error) {
      alert('Erreur upload média : ' + (error as Error).message);
    }
  };

  const updateProjectMeta = async () => {
    if (!projectId) return;

    try {
      const payload = {
        ...projectForm,
        projectProgressMedia: projectForm.projectProgressMedia?.length
          ? JSON.stringify(projectForm.projectProgressMedia)
          : '',
        portfolioMedia: Array.isArray(projectForm.portfolioMedia)
          ? JSON.stringify(projectForm.portfolioMedia)
          : (projectForm.portfolioMedia || ''),
      };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
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

  const fetchTeamAccesses = async () => {
    if (!projectId) return;

    try {
      const [teamsRes, accessRes] = await Promise.all([
        fetch('/api/user/teams', { credentials: 'include' }),
        fetch(`/api/projects/${projectId}/team-access`, { credentials: 'include' }),
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setAvailableTeams(Array.isArray(teamsData) ? teamsData : []);
      }

      if (accessRes.ok) {
        const accessData = await accessRes.json();
        setTeamAccesses(Array.isArray(accessData) ? accessData : []);
      }
    } catch (error) {
      console.error('Erreur chargement accès équipes projet:', error);
      setAvailableTeams([]);
      setTeamAccesses([]);
    }
  };

  const fetchProjectRecommendations = async () => {
    if (!projectId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/recommendations`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur récupération recommandations');
      }

      const data = await res.json();
      setProjectRecommendations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement recommandations projet:', error);
      setProjectRecommendations([]);
    }
  };

  const handleRecommendationValidation = async (recommendationId: string, status: 'VALIDATED' | 'REJECTED' | 'MODIFIED', validationNote?: string) => {
    if (!recommendationId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/recommendations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recommendationId, status, validationNote: validationNote || undefined }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur validation recommandation');
      await fetchProjectRecommendations();
      alert('✅ Recommandation mise à jour.');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  const handleShareWithTeam = async () => {
    if (!projectId || !teamAccessForm.teamId) {
      alert('Sélectionnez d’abord une équipe.');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/team-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teamId: teamAccessForm.teamId,
          permission: teamAccessForm.permission,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur partage équipe');

      setTeamAccessForm({ teamId: '', permission: 'READ' });
      await fetchTeamAccesses();
      alert('✅ Accès équipe mis à jour.');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  const handleRemoveTeamAccess = async (accessId: string) => {
    if (!accessId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/team-access`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur retrait accès');
      await fetchTeamAccesses();
      alert('✅ Accès retiré.');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  // ===== FETCH PROJECT =====
  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setUserPermission(data.userPermission || null);
        const effectiveDepositPercent = data.depositPercent ?? (
          data.clientBudgetMax && Number(data.clientBudgetMax) > 0 && data.depositAmount
            ? (Number(data.depositAmount) / Number(data.clientBudgetMax)) * 100
            : null
        );

        const metadata = (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)) ? data.metadata : {};

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
          projectProgressMedia: parseMediaList(data.projectProgressMedia),
          portfolioMedia: parseMediaList(data.portfolioMedia),
          portfolioRating: data.portfolioRating != null ? String(data.portfolioRating) : '',
          portfolioReview: data.portfolioReview || '',
          clientBudgetMax: data.clientBudgetMax != null ? String(data.clientBudgetMax) : '',
          depositAmount: data.depositAmount != null ? String(data.depositAmount) : '',
          depositPercent: effectiveDepositPercent != null ? String(effectiveDepositPercent) : '',
          depositProofUrl: data.depositProofUrl || '',
          depositValidated: Boolean(data.depositValidated) || (effectiveDepositPercent != null && effectiveDepositPercent >= 25),
          handoffStatus: typeof metadata.handoffStatus === 'string' ? metadata.handoffStatus : 'none',
          handoffTargetFamily: typeof metadata.handoffTargetFamily === 'string' ? metadata.handoffTargetFamily : 'vendeur',
          handoffMessage: typeof metadata.handoffMessage === 'string' ? metadata.handoffMessage : '',
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

  const toggleClientProvidedItem = (itemId: string) => {
    setClientProvidedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const addRecommendation = () => {
    setRecommendations((prev) => [
      ...prev,
      {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productName: 'Produit recommandé',
        brand: '',
        vendorName: '',
        unitPrice: 0,
        externalUrl: '',
        notes: '',
        selected: prev.length === 0,
      },
    ]);
  };

  const updateRecommendation = (id: string, field: string, value: string | number | boolean) => {
    setRecommendations((prev) => prev.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const selectedRecommendation = recommendations.find((item) => item.selected) || recommendations[0] || null;

  const projectTotalHt = project?.items?.reduce((sum: number, item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPriceHtAtSale || 0);
    return sum + quantity * unitPrice;
  }, 0) || 0;

  const materialTotal = project?.items?.reduce((sum: number, item: any) => {
    if (!item.product) return sum;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPriceHtAtSale || 0);
    return sum + quantity * unitPrice;
  }, 0) || 0;

  const serviceTotal = project?.items?.reduce((sum: number, item: any) => {
    if (!item.service) return sum;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPriceHtAtSale || 0);
    return sum + quantity * unitPrice;
  }, 0) || 0;

  const excludedClientTotal = project?.items?.reduce((sum: number, item: any) => {
    if (!clientProvidedItems[item.id]) return sum;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPriceHtAtSale || 0);
    return sum + quantity * unitPrice;
  }, 0) || 0;

  const budgetLimit = projectForm.clientBudgetMax ? Number(projectForm.clientBudgetMax) : null;
  const effectiveProjectTotal = Math.max(projectTotalHt - excludedClientTotal, 0);
  const budgetExceeded = budgetLimit !== null && effectiveProjectTotal > budgetLimit;
  const projectProgressMedia = Array.isArray(projectForm.projectProgressMedia) ? projectForm.projectProgressMedia : [];
  const portfolioMedia = Array.isArray(projectForm.portfolioMedia) ? projectForm.portfolioMedia : [];

  const renderMediaCard = (url: string, label: string, compact = false) => {
    const isVideo = /\.(mp4|webm|mov|avi|m4v)(\?.*)?$/i.test(url) || /video/i.test(url);

    return (
      <div key={`${label}-${url}`} className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${compact ? 'h-28' : 'h-40'}`}>
        {isVideo ? (
          <video src={url} controls className="h-full w-full object-cover" />
        ) : (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        )}
      </div>
    );
  };

  // ===== LOAD =====
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchProposals(), fetchTeamAccesses(), fetchProjectRecommendations()]);
      setLoading(false);
    };
    load();
  }, [projectId]);

  useEffect(() => {
    if (!project?.items || project.items.length === 0) {
      if (recommendations.length === 0) {
        setRecommendations([
          {
            id: 'default-rec-1',
            productName: 'Produit à comparer',
            brand: '',
            vendorName: '',
            unitPrice: 0,
            externalUrl: '',
            notes: '',
            selected: true,
          },
        ]);
      }
      return;
    }

    setRecommendations((prev) => {
      if (prev.length > 0) return prev;

      return project.items.slice(0, 3).map((item: any, index: number) => {
        const name = item.product?.name || item.service?.name || 'Produit recommandé';
        return {
          id: `proj-rec-${item.id || index}`,
          productName: name,
          brand: '',
          vendorName: '',
          unitPrice: Number(item.unitPriceHtAtSale || 0),
          externalUrl: '',
          notes: '',
          selected: index === 0,
        };
      });
    });
  }, [project]);

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
        <button
          onClick={() => router.push("/artisan")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à mes projets
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
            {(project.status === 'ACCEPTE' || project.clientFeedbackStatus === 'ACCEPTED') && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">✅ Projet accepté par le client</span>
            )}
            {(project.status === 'REFUSE' || project.clientFeedbackStatus === 'REJECTED') && (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-800">⚠️ Projet refusé par le client</span>
            )}
            {(project.clientFeedbackStatus === 'REQUEST_DISCOUNT') && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">💸 Demande de remise du client</span>
            )}
          </div>

          {project.clientFeedbackStatus === 'REQUEST_DISCOUNT' && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Demande de remise reçue :</strong> le client souhaite une négociation sur le devis. Vérifiez le commentaire ci-dessous et ajustez votre offre si nécessaire.
            </div>
          )}

          {budgetExceeded && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⚠️ Le montant estimé du projet dépasse le budget max client. Coût actuel estimé : <strong>{effectiveProjectTotal.toFixed(2)} €</strong> pour un budget de <strong>{budgetLimit!.toFixed(2)} €</strong>.
              <div className="mt-1 text-xs text-amber-800">Le client a un budget maximal, il faut soit revaloriser le devis soit ajuster les quantités ou les matériaux fournis par le client.</div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 xl:col-span-1 shadow-sm shadow-sky-100/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">Infos client</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                  {project.clientName && <div><span className="font-medium text-slate-900">Nom client :</span> {project.clientName}</div>}
                  {project.clientPhone && <div><span className="font-medium text-slate-900">Téléphone :</span> {project.clientPhone}</div>}
                  {project.clientEmail && <div className="md:col-span-2"><span className="font-medium text-slate-900">Email :</span> {project.clientEmail}</div>}
                  {project.clientAddress && <div className="md:col-span-2"><span className="font-medium text-slate-900">Adresse :</span> {project.clientAddress}</div>}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Nom client</span>
                    <input type="text" value={projectForm.clientName} onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Téléphone</span>
                    <input type="text" value={projectForm.clientPhone} onChange={(e) => setProjectForm({ ...projectForm, clientPhone: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label className="text-sm text-gray-700 md:col-span-2">
                    <span className="block mb-1 font-medium">Email client</span>
                    <input type="email" value={projectForm.clientEmail} onChange={(e) => setProjectForm({ ...projectForm, clientEmail: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label className="text-sm text-gray-700 md:col-span-2">
                    <span className="block mb-1 font-medium">Adresse client</span>
                    <input type="text" value={projectForm.clientAddress} onChange={(e) => setProjectForm({ ...projectForm, clientAddress: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Date de début</span>
                    <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Date de fin</span>
                    <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 xl:col-span-2 shadow-sm shadow-rose-100/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">Infos projet</p>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                  {project.type && <div><span className="font-medium text-slate-900">Type :</span> {project.type}</div>}
                  {project.surface && <div><span className="font-medium text-slate-900">Surface :</span> {project.surface} m²</div>}
                  <div><span className="font-medium text-slate-900">Statut :</span> {project.status || "BROUILLON"}</div>
                  {projectSummary.description ? (
                    <div className="md:col-span-2 text-slate-600"><span className="font-medium text-slate-900">Description :</span> {projectSummary.description}</div>
                  ) : null}
                </div>

                {project.items && project.items.length > 0 && (
                  <div className="mt-4 border-t border-rose-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">📦 Matériaux / Prestations :</p>
                    <div className="space-y-3">
                      {project.items.map((item: any) => {
                        const name = item.product?.name || item.service?.name || 'Inconnu';
                        const kind = item.product ? 'Produit' : item.service ? 'Prestation' : 'Ligne';
                        const isProvidedByClient = !!clientProvidedItems[item.id];
                        const lineTotal = Number(item.quantity || 0) * Number(item.unitPriceHtAtSale || 0);

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border p-3 ${isProvidedByClient ? 'border-green-200 bg-green-50' : 'border-white bg-white/60'}`}
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div className="text-sm text-gray-700">
                                <span className="font-medium text-gray-900">{name}</span>
                                <span className="mx-2 text-xs uppercase tracking-wide text-gray-500">{kind}</span>
                                <span className="mx-2">–</span>
                                {item.quantity} unité(s)
                                <span className="mx-2">–</span>
                                {item.unitPriceHtAtSale} € HT
                                <span className="ml-2 text-gray-500">({lineTotal.toFixed(2)} €)</span>
                              </div>
                              {item.product && (
                                <label className="flex items-center gap-2 text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={isProvidedByClient}
                                    onChange={() => toggleClientProvidedItem(item.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                  />
                                  Matériel fourni par le client
                                </label>
                              )}
                            </div>
                            {isProvidedByClient && item.product && (
                              <div className="mt-2 text-xs text-green-700 bg-white border border-green-200 rounded px-2 py-1">
                                ✅ Prix exclu du devis : ce matériel est à la charge du client.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 rounded-lg bg-white/70 border border-rose-200 p-3 text-sm text-slate-700">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <span>Montant total du devis :</span>
                        <strong>{projectTotalHt.toFixed(2)} €</strong>
                      </div>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <span>Montant matériels :</span>
                        <strong>{materialTotal.toFixed(2)} €</strong>
                      </div>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <span>Montant prestations artisan :</span>
                        <strong>{serviceTotal.toFixed(2)} €</strong>
                      </div>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <span>Matériaux fournis par le client :</span>
                        <strong>{excludedClientTotal.toFixed(2)} €</strong>
                      </div>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <span>Montant net après ajustement :</span>
                        <strong>{effectiveProjectTotal.toFixed(2)} €</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectSummary.description ? (
                    <label className="text-sm text-gray-700 md:col-span-2">
                      <span className="block mb-1 font-medium">Description</span>
                      <textarea value={projectSummary.description} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" rows={3} />
                    </label>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 xl:col-span-2 shadow-sm shadow-violet-100/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">Compléments</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Statut client</span>
                    <select value={projectForm.clientFeedbackStatus} onChange={(e) => setProjectForm({ ...projectForm, clientFeedbackStatus: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500">
                      <option value="PENDING">En attente</option>
                      <option value="CONFIRMED">Confirmé</option>
                      <option value="REQUEST_CHANGES">Demande des modifications</option>
                      <option value="REJECTED">Refusé</option>
                    </select>
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">URL publique du projet</span>
                    <input type="text" value={projectForm.sharePublicUrl} onChange={(e) => setProjectForm({ ...projectForm, sharePublicUrl: e.target.value })} disabled={!canEditProject} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500" placeholder="https://..." />
                  </label>
                  <label className="text-sm text-gray-700 md:col-span-2">
                    <span className="block mb-1 font-medium">Commentaire client / retour</span>
                    <textarea value={projectForm.clientFeedbackMessage} onChange={(e) => setProjectForm({ ...projectForm, clientFeedbackMessage: e.target.value })} disabled={!canEditProject} className={`w-full px-3 py-2 border rounded-lg disabled:bg-slate-100 disabled:text-slate-500 ${projectForm.clientFeedbackStatus === 'REQUEST_DISCOUNT' ? 'border-amber-300 bg-amber-50' : 'border-gray-300 bg-white'}`} rows={3} />
                  </label>

                  {projectForm.clientFeedbackStatus === 'REQUEST_DISCOUNT' && (
                    <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">Réponse à la demande de remise</p>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                        <label className="text-sm text-gray-700">
                          <span className="block mb-1 font-medium">Prix final (€)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={discountFinalPrice}
                            onChange={(e) => setDiscountFinalPrice(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="300.00"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => openDiscountResponse('accept', discountFinalPrice)}
                          disabled={!canEditProject}
                          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          OK
                        </button>

                        <button
                          type="button"
                          onClick={() => openDiscountResponse('refuse')}
                          disabled={!canEditProject}
                          className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Refus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`rounded-2xl border p-4 shadow-sm ${Number(projectForm.depositPercent || 0) >= 25 ? 'border-emerald-200 bg-emerald-50 shadow-emerald-100/80' : 'border-amber-200 bg-amber-50 shadow-amber-100/80'}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Infos paiement</p>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <div><span className="font-medium text-slate-900">Statut :</span> {Number(projectForm.depositPercent || 0) >= 25 ? 'Validé' : 'À valider'}</div>
                </div>

                <div className="mt-4 space-y-4">
                  <label className="text-sm text-gray-700 block">
                    <span className="block mb-1 font-medium">Acompte versé (€)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={projectForm.depositAmount}
                      onChange={(e) => {
                        const nextAmount = e.target.value;
                        const clientBudget = Number(projectForm.clientBudgetMax || 0);
                        const percent = clientBudget > 0 && nextAmount !== '' ? (Number(nextAmount) / clientBudget) * 100 : 0;
                        setProjectForm({
                          ...projectForm,
                          depositAmount: nextAmount,
                          depositPercent: nextAmount === '' ? '' : String(percent),
                          depositValidated: percent >= 25,
                        });
                      }}
                      disabled={!canEditProject}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder="2500"
                    />
                  </label>
                  <label className="text-sm text-gray-700 block">
                    <span className="block mb-1 font-medium">Pourcentage (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={projectForm.depositPercent}
                      onChange={(e) => {
                        const nextPercent = e.target.value;
                        setProjectForm({
                          ...projectForm,
                          depositPercent: nextPercent,
                          depositValidated: Number(nextPercent || 0) >= 25,
                        });
                      }}
                      disabled={!canEditProject}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder="25"
                    />
                  </label>
                  <label className="text-sm text-gray-700 block">
                    <span className="block mb-1 font-medium">Preuve d’acompte / justificatif</span>
                    <input
                      type="url"
                      value={projectForm.depositProofUrl}
                      onChange={(e) => setProjectForm({ ...projectForm, depositProofUrl: e.target.value })}
                      disabled={!canEditProject}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder="https://... / lien de paiement / preuve"
                    />
                  </label>
                  <div className="rounded-lg border px-3 py-2 text-sm text-gray-700 bg-white/60">
                    {Number(projectForm.depositPercent || 0) >= 25
                      ? '✅ Validation : acompte de 25% minimum confirmé.'
                      : '⚠️ Condition non remplie : acompte inférieur à 25%.'}
                  </div>
                </div>

                {projectForm.depositProofUrl && (
                  <div className="mt-3">
                    <a href={projectForm.depositProofUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">Voir la preuve d’acompte</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm shadow-emerald-100/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Portfolio</p>
              <div className="mt-3 space-y-3">
                {portfolioMedia.length > 0 ? (
                  portfolioMedia.map((url: string) => renderMediaCard(url, 'Portfolio', true))
                ) : (
                  <div className="rounded-xl border border-dashed border-violet-200 bg-white/50 p-3 text-sm text-slate-600">
                    Aucun média de portfolio.
                  </div>
                )}
              </div>
              <div className="mt-4">
                <span className="block mb-1 font-medium text-sm text-gray-700">Ajouter plusieurs images / vidéos</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    try {
                      const uploadedUrls: string[] = [];

                      for (const file of files) {
                        const form = new FormData();
                        form.append('file', file);

                        const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Upload impossible');
                        uploadedUrls.push(data.url);
                      }

                      setProjectForm((prev: any) => ({
                        ...prev,
                        portfolioMedia: [...parseMediaList(prev.portfolioMedia), ...uploadedUrls],
                      }));
                      alert(`${uploadedUrls.length} média${uploadedUrls.length > 1 ? 'x' : ''} ajouté${uploadedUrls.length > 1 ? 's' : ''} avec succès`);
                    } catch (error) {
                      alert('Erreur upload média : ' + (error as Error).message);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 xl:col-span-2 shadow-sm shadow-orange-100/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">Téléchargements du projet</p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {projectProgressMedia.length > 0 ? (
                  projectProgressMedia.map((url: string) => renderMediaCard(url, 'Média projet', true))
                ) : (
                  <div className="col-span-full rounded-xl border border-dashed border-orange-200 bg-white/50 p-3 text-sm text-slate-600">
                    Aucune image ou vidéo ajoutée pour ce projet.
                  </div>
                )}
              </div>
              <div className="mt-4">
                <span className="block mb-1 font-medium text-sm text-gray-700">Ajouter des médias de progression</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => void uploadProgressMedia(e.target.files)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={updateProjectMeta}
              disabled={!canEditProject}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enregistrer les infos projet
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-semibold">� Transfert de devis entre superviseurs</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <select
              value={projectForm.handoffStatus || 'none'}
              onChange={(e) => setProjectForm((prev: any) => ({ ...prev, handoffStatus: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="none">Aucun transfert</option>
              <option value="artisan-to-vendor">Devis technique prêt pour le superviseur vendeur</option>
              <option value="vendor-to-artisan">Retour vendeur / demande de compléments artisan</option>
              <option value="validated">Devis finalisé et validé</option>
            </select>

            <select
              value={projectForm.handoffTargetFamily || 'vendeur'}
              onChange={(e) => setProjectForm((prev: any) => ({ ...prev, handoffTargetFamily: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="vendeur">Superviseur vendeur</option>
              <option value="artisan">Superviseur artisan</option>
            </select>

            <input
              type="text"
              value={projectForm.handoffMessage || ''}
              onChange={(e) => setProjectForm((prev: any) => ({ ...prev, handoffMessage: e.target.value }))}
              placeholder="Message de transfert"
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="text-sm text-slate-600">
            {projectForm.handoffStatus === 'none' && 'Aucun transfert actif pour ce projet.'}
            {projectForm.handoffStatus === 'artisan-to-vendor' && 'Le devis technique est prêt et transmis au superviseur vendeur pour l’orientation commerciale.'}
            {projectForm.handoffStatus === 'vendor-to-artisan' && 'Le superviseur vendeur demande un complément ou une validation technique côté artisan.'}
            {projectForm.handoffStatus === 'validated' && 'Le devis est validé et le projet est prêt pour finalisation.'}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-semibold">�🔐 Partage du projet avec une équipe</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <select
              value={teamAccessForm.teamId}
              onChange={(e) => setTeamAccessForm((prev) => ({ ...prev, teamId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Choisir une équipe</option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            <select
              value={teamAccessForm.permission}
              onChange={(e) => setTeamAccessForm((prev) => ({ ...prev, permission: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="READ">Lecture</option>
              <option value="COMMENT">Commentaire</option>
              <option value="EDIT">Édition</option>
              <option value="VALIDATE">Validation</option>
            </select>

            <button
              type="button"
              onClick={handleShareWithTeam}
              disabled={!canManageProjectAccess}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Partager le projet
            </button>
          </div>

          {teamAccesses.length === 0 ? (
            <div className="text-sm text-slate-500">Aucune équipe n’a encore accès à ce projet.</div>
          ) : (
            <div className="space-y-2">
              {teamAccesses.map((access) => (
                <div key={access.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{access.team?.name || 'Équipe'}</span>
                    <span className="ml-2 text-slate-500">({access.permission})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeamAccess(access.id)}
                    disabled={!canManageProjectAccess}
                    className="px-2 py-1 text-xs border border-red-200 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-semibold">🧭 Recommandations éditables</h2>
            <button
              onClick={addRecommendation}
              disabled={!canEditProject}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Ajouter une recommandation
            </button>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Validation IA / décision humaine</h3>
            </div>

            {projectRecommendations.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune recommandation IA n’a encore été générée pour ce projet.</p>
            ) : (
              <div className="space-y-3">
                {projectRecommendations.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{item.agent?.name || 'Agent IA'} · {item.category}</div>
                        <div className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{item.content}</div>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === 'VALIDATED' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        item.status === 'MODIFIED' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {item.status || 'PENDING'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRecommendationValidation(item.id, 'VALIDATED', 'Recommandation validée par l’équipe.')}
                        disabled={!canValidateProject}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecommendationValidation(item.id, 'REJECTED', 'Recommandation rejetée par l’équipe.')}
                        disabled={!canValidateProject}
                        className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Rejeter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecommendationValidation(item.id, 'MODIFIED', 'Recommandation ajustée par l’équipe.')}
                        disabled={!canValidateProject}
                        className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Modifier
                      </button>
                    </div>

                    {item.validationNote && (
                      <div className="mt-3 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        Note de validation : {item.validationNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedRecommendation && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Vendeur sélectionné : <strong>{selectedRecommendation.vendorName || 'À définir'}</strong>
              {selectedRecommendation.externalUrl ? (
                <>
                  <span className="mx-2">•</span>
                  <a href={selectedRecommendation.externalUrl} target="_blank" rel="noreferrer" className="underline font-medium">Ouvrir l’achat externe</a>
                </>
              ) : null}
            </div>
          )}

          <div className="space-y-4">
            {recommendations.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${item.selected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="font-medium text-gray-800">{item.productName || 'Produit recommandé'}</div>
                  <button
                    type="button"
                    onClick={() => setRecommendations((prev) => prev.map((r) => ({ ...r, selected: r.id === item.id }))) }
                    className={`px-2 py-1 text-xs rounded ${item.selected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {item.selected ? 'Sélectionné' : 'Choisir'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Produit</span>
                    <input
                      value={item.productName}
                      onChange={(e) => updateRecommendation(item.id, 'productName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Marque</span>
                    <input
                      value={item.brand}
                      onChange={(e) => updateRecommendation(item.id, 'brand', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ex. Roca, Hager, ..."
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Vendeur</span>
                    <input
                      value={item.vendorName}
                      onChange={(e) => updateRecommendation(item.id, 'vendorName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Nom du vendeur"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Prix unitaire</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateRecommendation(item.id, 'unitPrice', Number(e.target.value || 0))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </label>
                  <label className="text-sm text-gray-700 md:col-span-2">
                    <span className="block mb-1 font-medium">URL d’achat externe</span>
                    <input
                      value={item.externalUrl}
                      onChange={(e) => updateRecommendation(item.id, 'externalUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://..."
                    />
                  </label>
                  <label className="text-sm text-gray-700 md:col-span-2">
                    <span className="block mb-1 font-medium">Notes / remarque</span>
                    <textarea
                      value={item.notes}
                      onChange={(e) => updateRecommendation(item.id, 'notes', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ex. produit compatible, meilleure finition, livraison 3 jours..."
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
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
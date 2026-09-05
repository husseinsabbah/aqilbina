"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type UserProject = {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  clientFeedbackStatus?: string | null;
  sharePublicUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string | null;
  isArchived?: boolean;
  isSharedProject?: boolean;
  projectPermission?: string;
};

type UserAgent = {
  id: string;
  agentId: string;
  agent?: {
    id: string;
    name: string;
    type: string;
    specialty: string | null;
  } | null;
  customName?: string | null;
  status: "PENDING" | "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  startDate: string;
  endDate: string | null;
};

type Team = {
  id: string;
  name: string;
  specialty: string | null;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const currentRole = ((session?.user?.role || session?.user?.trade || "artisan") as string).toLowerCase();
  const profileType = currentRole.includes("vendeur") ? "vendeur" : currentRole.includes("promoteur") ? "promoteur" : "artisan";
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [teamSpecialties, setTeamSpecialties] = useState<string[]>([]);
  const [primaryTrade, setPrimaryTrade] = useState<string>("");

  // Charger les projets
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const response = await fetch("/api/user/projects", { credentials: "include" });
        if (!response.ok) throw new Error("Impossible de charger les devis");
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erreur chargement devis dashboard:", error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    void loadProjects();
  }, []);

  // Charger les agents actifs
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoadingAgents(true);
        const response = await fetch("/api/user/agents?detail=true", { credentials: "include" });
        if (!response.ok) throw new Error("Impossible de charger les agents");
        const data = await response.json();
        setUserAgents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erreur chargement agents:", error);
        setUserAgents([]);
      } finally {
        setLoadingAgents(false);
      }
    };

    void loadAgents();
  }, []);

  // Charger le contexte d'équipe
  useEffect(() => {
    const loadTeamContext = async () => {
      try {
        const [profileRes, teamsRes] = await Promise.all([
          fetch("/api/user/profile", { credentials: "include" }),
          fetch("/api/user/teams", { credentials: "include" }),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const trade = String(profileData.trade || profileData.role || "").trim();
          setPrimaryTrade(trade);
        }

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const specialties = Array.isArray(teamsData)
            ? teamsData
                .map((team: Team) => String(team.specialty || "").trim())
                .filter((value: string) => Boolean(value))
            : [];

          setTeamSpecialties([...new Set(specialties)]);
        }
      } catch (error) {
        console.error("Erreur chargement equipes dashboard:", error);
      }
    };

    void loadTeamContext();
  }, []);

  // Compter les agents actifs (ACTIVE + TRIAL)
  const activeAgents = useMemo(() => {
    return userAgents.filter((ua) => ua.status === "ACTIVE" || ua.status === "TRIAL");
  }, [userAgents]);

  const activeAgentsCount = activeAgents.length;

  const dashboardConfig: Record<string, { title: string; cta: string; ctaHref: string; stats: { label: string; value: string; color: string }[]; projectsTitle: string }> = {
    artisan: {
      title: "🏗️ Tableau de bord artisan",
      cta: "+ Nouveau projet",
      ctaHref: "/artisan/projets/nouveau",
      stats: [
        { label: "Projets en cours", value: "3", color: "bg-blue-500" },
        { label: "Devis envoyés", value: "7", color: "bg-purple-500" },
        { label: "Chantiers suivis", value: "12", color: "bg-green-500" },
        { label: "CA du mois", value: "12 450 €", color: "bg-yellow-500" },
      ],
      projectsTitle: "📋 Mes derniers projets",
    },
    vendeur: {
      title: "📦 Tableau de bord vendeur",
      cta: "+ Souscrire un agent",
      ctaHref: "/abonnement",
      stats: [
        { label: "Catalogues", value: "4", color: "bg-blue-500" },
        { label: "Produits", value: "124", color: "bg-green-500" },
        { label: "Offres envoyées", value: "18", color: "bg-purple-500" },
        { label: "CA du mois", value: "24 800 €", color: "bg-yellow-500" },
      ],
      projectsTitle: "📋 Dernières demandes",
    },
    promoteur: {
      title: "🏢 Tableau de bord promoteur",
      cta: "+ Nouveau programme",
      ctaHref: "/projets",
      stats: [
        { label: "Programmes", value: "5", color: "bg-blue-500" },
        { label: "Lots suivis", value: "16", color: "bg-green-500" },
        { label: "Entreprises actives", value: "9", color: "bg-purple-500" },
        { label: "Budget global", value: "148 k€", color: "bg-yellow-500" },
      ],
      projectsTitle: "📋 Suivi des projets",
    },
  };

  const config = dashboardConfig[profileType];

  const displayedProjects = useMemo(() => projects.slice(0, 4), [projects]);

  const getStatusClass = (status: string) => {
    const normalized = status?.toUpperCase() || "ACTIVE";

    if (["ACTIVE", "PENDING", "EN_ATTENTE"].includes(normalized)) return "bg-yellow-100 text-yellow-800";
    if (["NEGOCIATION", "EN_COURS"].includes(normalized)) return "bg-blue-100 text-blue-800";
    if (["ACCEPTE", "TERMINE", "VALIDATED"].includes(normalized)) return "bg-green-100 text-green-800";
    if (["REFUSE", "REJECTED", "ARCHIVE"].includes(normalized)) return "bg-slate-200 text-slate-700";
    return "bg-slate-100 text-slate-700";
  };

  const permissionLabel: Record<string, string> = {
    READ: "Lecture",
    COMMENT: "Commentaire",
    EDIT: "Édition",
    VALIDATE: "Validation",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{config.title}</h1>
          {profileType === "artisan" && (
            <p className="mt-2 text-sm text-slate-600">
              Metier principal: <span className="font-semibold text-slate-800">{primaryTrade || "artisan"}</span>
              {teamSpecialties.length > 0 ? (
                <>
                  {" "}
                  · Metiers d&apos;equipe: <span className="font-semibold text-slate-800">{teamSpecialties.join(", ")}</span>
                </>
              ) : null}
            </p>
          )}
        </div>
        <a
          href={config.ctaHref}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {config.cta}
        </a>
      </div>

      {/* ============================================================
          CADRE "MES AGENTS IA"
      ============================================================ */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl shadow-sm border border-indigo-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              🤖 Mes agents IA
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {loadingAgents ? (
                "Chargement..."
              ) : activeAgentsCount === 0 ? (
                "Vous n'avez pas encore d'agent actif. Souscrivez à un abonnement pour débloquer l'assistant IA."
              ) : (
                <>
                  Vous disposez de <span className="font-bold text-indigo-700">{activeAgentsCount}</span> agent{activeAgentsCount > 1 ? "s" : ""} actif{activeAgentsCount > 1 ? "s" : ""}.
                </>
              )}
            </p>
          </div>
          <a
            href="/abonnement"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center gap-2"
          >
            <span>Gérer mes agents</span>
            <span className="text-lg">→</span>
          </a>
        </div>

        {!loadingAgents && activeAgentsCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeAgents.slice(0, 4).map((ua) => (
              <span
                key={ua.id}
                className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-200 shadow-sm"
              >
                {ua.customName || ua.agent?.name || "Agent"}
                {ua.status === "TRIAL" && (
                  <span className="ml-1 text-[10px] text-blue-500 font-semibold">(Essai)</span>
                )}
              </span>
            ))}
            {activeAgentsCount > 4 && (
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200 shadow-sm">
                +{activeAgentsCount - 4} autre{activeAgentsCount - 4 > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          STATS
      ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {config.stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold text-gray-800 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ============================================================
          TABLEAU DES DEVIS
      ============================================================ */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">📄 Mes devis</h2>
            <p className="text-sm text-slate-500">Les devis clôturés restent accessibles en lecture seule pour conserver l&apos;historique.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Historique conservé</span>
        </div>

        {loadingProjects ? (
          <p className="text-sm text-slate-500">Chargement de vos devis...</p>
        ) : displayedProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Aucun devis pour le moment. Créez votre premier projet pour commencer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="pb-3 text-sm font-medium text-gray-500">Projet</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Statut</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Client</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedProjects.map((project) => (
                  <tr key={project.id} className="border-b border-gray-50">
                    <td className="py-3 text-sm text-gray-800">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-slate-500">{new Date(project.createdAt).toLocaleDateString("fr-FR")}</div>
                    </td>
                    <td className="py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(project.statusLabel || project.status)}`}>
                        {project.statusLabel || project.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-700">{project.clientName || "—"}</td>
                    <td className="py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={project.sharePublicUrl || "#"}
                            target={project.sharePublicUrl ? "_blank" : undefined}
                            rel={project.sharePublicUrl ? "noreferrer" : undefined}
                            className="text-blue-600 hover:underline"
                          >
                            {project.isArchived ? "Voir l&apos;historique" : "Voir le devis"}
                          </a>
                          {project.isSharedProject && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700">
                              partagé
                            </span>
                          )}
                        </div>
                        {project.projectPermission && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                            {permissionLabel[project.projectPermission] || project.projectPermission}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
          PROJETS RÉCENTS
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{config.projectsTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="pb-3 text-sm font-medium text-gray-500">Nom</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Statut</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Montant</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: profileType === "artisan" ? "Rénovation cuisine - Dupont" : profileType === "vendeur" ? "Commande matériaux - Martin" : "Lot 3 - Résidence Ouest",
                  status: "En attente",
                  amount: profileType === "artisan" ? "3 200 €" : profileType === "vendeur" ? "1 480 €" : "18 600 €",
                },
                {
                  name: profileType === "artisan" ? "Salle de bain - Martin" : profileType === "vendeur" ? "Plomberie - Bâtiment A" : "Lot 5 - Centre médical",
                  status: "En cours",
                  amount: profileType === "artisan" ? "4 500 €" : profileType === "vendeur" ? "2 100 €" : "21 400 €",
                },
                {
                  name: profileType === "artisan" ? "Carrelage terrasse - Bernard" : profileType === "vendeur" ? "Sanitaire - Entreprise B" : "Lot 7 - Immeuble Rive",
                  status: "Terminé",
                  amount: profileType === "artisan" ? "1 800 €" : profileType === "vendeur" ? "960 €" : "14 200 €",
                },
              ].map((project, index) => (
                <tr key={index} className="border-b border-gray-50">
                  <td className="py-3 text-sm text-gray-800">{project.name}</td>
                  <td className="py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === "En attente"
                          ? "bg-yellow-100 text-yellow-800"
                          : project.status === "En cours"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-800">{project.amount}</td>
                  <td className="py-3 text-sm">
                    <a href="#" className="text-blue-600 hover:underline">
                      Voir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
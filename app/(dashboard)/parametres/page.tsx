"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus, Edit, Trash2, X, Package, ExternalLink,
  Loader2, Crown, Store, Building2
} from "lucide-react";
import { getLocaleFromStorage, messages, type Locale } from "@/lib/i18n";
import { buildAutoServiceCategory, getTradeRules, getWorkTypeLabel } from "@/lib/trade-rules";

// ============================================================
// TYPES
// ============================================================
type ServiceType = {
  id: string;
  name: string;
  label: string;
  description: string | null;
};

type UserService = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  isDefault: boolean;
  serviceType: ServiceType;
  serviceCategory?: string | null;
};

type Catalog = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
};

type Agent = {
  id: string;
  name: string;
  type: string;
  specialty: string | null;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
};

type UserAgent = {
  id: string;
  agentId: string;
  agent?: Agent | null;
  customName?: string | null;
  status: "PENDING" | "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  startDate: string;
  endDate: string | null;
  trialEndDate: string | null;
  cancelledAt: string | null;
  graceEndAt: string | null;
  autoRenew: boolean;
};

type TeamMember = {
  id: string;
  role: string;
  user?: { id: string; name?: string; email?: string } | null;
};

type TeamAgent = {
  id: string;
  userAgent?: { agent?: Agent | null } | null;
};

type Team = {
  id: string;
  name: string;
  specialty: string | null;
  ownerId: string;
  members?: TeamMember[];
  agents?: TeamAgent[];
};

type ServiceTemplateDraft = {
  description: string;
  price: string;
  isActive: boolean;
};

// ============================================================
// PROFIL OPTIONS (conservés pour les autres usages)
// ============================================================
const buildingTypeOptions = [
  "Tous",
  "Maison individuelle",
  "Villa",
  "Immeuble",
  "Appartement",
  "Bureau",
  "Commerce",
  "Garage",
  "Entrepôt",
  "Autre",
] as const;

const profileOptions = {
  artisan: [
    { value: "carreleur", label: "🧱 Carreleur" },
    { value: "plombier", label: "💧 Plombier" },
    { value: "electricien", label: "⚡ Électricien" },
    { value: "peintre", label: "🎨 Peintre" },
    { value: "menuisier", label: "🪚 Menuisier" },
    { value: "maçon", label: "🧱 Maçon" },
    { value: "couvreur", label: "🏠 Couvreur" },
    { value: "terrassier", label: "🚜 Terrassier" },
    { value: "renovation", label: "🔧 Rénovation" },
    { value: "autres", label: "🔧 Autres" },
  ],
  vendeur: [
    { value: "materiaux", label: "🏗️ Matériaux de construction" },
    { value: "sanitaire", label: "🚿 Sanitaire" },
    { value: "quincaillerie", label: "🧰 Quincaillerie" },
    { value: "menuiserie", label: "🪵 Menuiserie" },
    { value: "isolation", label: "🛡️ Isolation" },
    { value: "outillage", label: "🔨 Outillage" },
    { value: "decoration", label: "🪴 Décoration" },
    { value: "autres", label: "📦 Autres" },
  ],
  promoteur: [
    { value: "promotion-immobiliere", label: "🏠 Promotion immobilière" },
    { value: "gestion-chantier", label: "📋 Gestion de chantier" },
    { value: "maitrise-oeuvre", label: "🧭 Maîtrise d’œuvre" },
    { value: "coordination-travaux", label: "🛠️ Coordination travaux" },
    { value: "amenagement", label: "🧱 Aménagement" },
    { value: "autres", label: "🏢 Autres" },
  ],
} as const;

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function ParametresPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [locale] = useState<Locale>(getLocaleFromStorage());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [services, setServices] = useState<UserService[]>([]);
  const [buildingTypeFilter, setBuildingTypeFilter] = useState<(typeof buildingTypeOptions)[number]>("Tous");
  const [serviceTemplateDrafts, setServiceTemplateDrafts] = useState<Record<string, ServiceTemplateDraft>>({});
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<UserService | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [inlineServiceForm, setInlineServiceForm] = useState({ description: "", unitPrice: "" });

  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [catalogForm, setCatalogForm] = useState({ name: "", description: "" });
  const [deletingCatalogId, setDeletingCatalogId] = useState<string | null>(null);

  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [userAgentsLoading, setUserAgentsLoading] = useState(false);
  const [cancellingAgentId, setCancellingAgentId] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", specialty: "" });
  const [teamMemberForms, setTeamMemberForms] = useState<Record<string, { userId: string; email: string; phone: string; role: string }>>({});
  const [teamAgentForms, setTeamAgentForms] = useState<Record<string, string>>({});

  const dict = messages[locale];

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    companyName: "",
    brandColor: "#1E40AF",
    logoUrl: "",
    trade: "",
    profileType: "artisan",
  });

  // On conserve la détection du profil et du métier pour la logique métier (prestations, catalogues, etc.)
  const profileTypeValue = (session?.user?.role || session?.user?.trade || formData.profileType || "artisan").toLowerCase();
  const resolvedProfileType = profileTypeValue.includes("vendeur") ? "vendeur" : profileTypeValue.includes("promoteur") ? "promoteur" : "artisan";
  const detectedTrade = formData.trade || session?.user?.trade || "";
  // specialtyOptions n'est plus utilisé dans l'UI mais peut être conservé pour d'autres logiques
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const specialtyOptions =
    profileOptions[(formData.profileType || resolvedProfileType || "artisan") as keyof typeof profileOptions] ?? profileOptions.artisan;

  const calculateAge = (value: string) => {
    if (!value) return null;
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const [serviceForm, setServiceForm] = useState({
    serviceTypeId: "",
    description: "",
    unit: "m²",
    unitPrice: "",
    serviceCategory: "",
    buildingType: "Maison individuelle",
    projectType: "",
    workType: "",
    surface: "",
  });

  const isVendeur = resolvedProfileType === "vendeur" || (formData.trade || "").toLowerCase() === "vendeur";
  const serviceTradeRules = useMemo(() => getTradeRules(detectedTrade), [detectedTrade]);
  const generatedServiceCategory = buildAutoServiceCategory(
    serviceForm.projectType,
    getWorkTypeLabel(detectedTrade, serviceForm.workType),
    serviceForm.surface,
  );

  const generatedServiceName = useMemo(() => {
    const workLabel = getWorkTypeLabel(detectedTrade, serviceForm.workType);
    const parts = [serviceForm.projectType, workLabel, serviceForm.surface].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : "Nouvelle prestation";
  }, [serviceForm.projectType, serviceForm.workType, serviceForm.surface, detectedTrade]);

  const normalizeForMatching = (value: string | null | undefined) =>
    (value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const getServiceBuildingType = useCallback((service: UserService): string | null => {
    const text = normalizeForMatching(`${service.name} ${service.serviceCategory ?? ""}`);

    for (const option of buildingTypeOptions) {
      if (option === "Tous") continue;
      const optionKey = normalizeForMatching(option);
      const keywords = {
        "Maison individuelle": ["maison individuelle", "maison", "facade", "toiture", "chauffage", "cuisine", "salle de bain", "mur", "sol", "terrasse"],
        Villa: ["villa", "terrasse", "escalier", "piscine", "amenagement", "maison"],
        Immeuble: ["immeuble", "facade", "ravalement", "escalier", "ascenseur", "etancheite", "batiment"],
        Appartement: ["appartement", "cuisine", "salle de bain", "plafond", "mur", "sol", "fenetre", "menuiserie", "peinture"],
        Bureau: ["bureau", "climatisation", "electricite", "peinture", "plafond", "sol", "facade", "menuiserie", "sanitaire"],
        Commerce: ["commerce", "vitrine", "magasin", "sol", "peinture", "electricite", "sanitaire", "menuiserie", "climatisation"],
        Garage: ["garage", "porte", "sol", "toiture", "carrelage", "serrurerie", "volet"],
        Entrepôt: ["entrepot", "toiture", "sol", "porte", "etancheite", "rampe", "rayonnage", "chantier"],
        Autre: ["autre", "general", "travaux", "renovation", "amenagement", "interieur", "exterieur"],
      }[option] || [];

      if (optionKey && keywords.some((keyword) => text.includes(normalizeForMatching(keyword)))) {
        return option;
      }
      if (text.includes(optionKey)) {
        return option;
      }
    }

    return null;
  }, []);

  const filteredServices = useMemo(() => {
    if (!buildingTypeFilter || buildingTypeFilter === "Tous") {
      return services;
    }

    return services.filter((service) => {
      const serviceBuildingType = getServiceBuildingType(service);
      if (serviceBuildingType === buildingTypeFilter) return true;

      if (buildingTypeFilter === "Autre") {
        const text = normalizeForMatching(`${service.name} ${service.serviceCategory ?? ""}`);
        const genericKeywords = ["renovation", "amenagement", "travaux", "finition", "prestation", "interieur", "exterieur", "standard"];
        return genericKeywords.some((keyword) => text.includes(keyword));
      }

      return false;
    });
  }, [services, buildingTypeFilter, getServiceBuildingType]);

  const serviceTemplates = useMemo(() => {
    const baseTemplates = [] as Array<{ id: string; name: string; category: string; unit: string; defaultPrice: number }>;
    const seen = new Set<string>();

    const addTemplate = (name: string, category: string, unit: string, defaultPrice: number) => {
      const key = `${name.toLowerCase()}|${category.toLowerCase()}|${unit.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      baseTemplates.push({ id: key, name, category, unit, defaultPrice });
    };

    const fallbackPrice = (unit: string) => (unit === "u" ? 120 : unit === "ml" ? 18 : unit === "jour" ? 200 : 35);

    serviceTradeRules.projectTypes.forEach((projectType) => {
      serviceTradeRules.workTypes.forEach((workType) => {
        const workLabel = getWorkTypeLabel(detectedTrade, workType.value);
        serviceTradeRules.surfaces.forEach((surface) => {
          const baseName = `${projectType} - ${workLabel} - ${surface}`;
          addTemplate(baseName, `${projectType} - ${workLabel}`, serviceTradeRules.units[0] || "m²", fallbackPrice(serviceTradeRules.units[0] || "m²"));
        });
      });
    });

    const defaultGeneric = [
      { name: "Pose de carrelage - Sol", category: "Carrelage - Sol", unit: "m²", defaultPrice: 35 },
      { name: "Pose de carrelage - Mur", category: "Carrelage - Mur", unit: "m²", defaultPrice: 42 },
      { name: "Pose de faïence - Salle de bain", category: "Faïence - Salle de bain", unit: "m²", defaultPrice: 55 },
      { name: "Plomberie - remplacement robinet", category: "Plomberie - Dépannage", unit: "u", defaultPrice: 120 },
      { name: "Électricité - prise standard", category: "Électricité - Prise", unit: "u", defaultPrice: 80 },
      { name: "Peinture - mur", category: "Peinture - Mur", unit: "m²", defaultPrice: 22 },
      { name: "Menuiserie - fenêtre", category: "Menuiserie - Fenêtre", unit: "u", defaultPrice: 180 },
      { name: "Maçonnerie - reprise mur", category: "Maçonnerie - Reprise", unit: "m²", defaultPrice: 45 },
      { name: "Toiture - étanchéité", category: "Toiture - Étanchéité", unit: "m²", defaultPrice: 40 },
      { name: "Terrassement - terrain", category: "Terrassement - Terrain", unit: "m³", defaultPrice: 60 },
    ];

    defaultGeneric.forEach((item) => addTemplate(item.name, item.category, item.unit, item.defaultPrice));

    return baseTemplates;
  }, [detectedTrade, serviceTradeRules]);

  const prestationBlocks = useMemo(() => {
    const blocks = [
      { title: "Gros œuvre", key: "gros-oeuvre", templates: [] as typeof serviceTemplates },
      { title: "Dépannage", key: "depannage", templates: [] as typeof serviceTemplates },
      { title: "Rénovation", key: "renovation", templates: [] as typeof serviceTemplates },
      { title: "Le reste", key: "reste", templates: [] as typeof serviceTemplates },
    ];

    const assignTemplate = (template: (typeof serviceTemplates)[number]) => {
      const text = `${template.name} ${template.category}`.toLowerCase();
      const categoryName = template.category.toLowerCase();

      if (/(gros oeuvre|gros-oeuvre|maçonnerie|maçon|toiture|terrassement|structure|fondation|charpente|enduit|dalle|beton|mur porteur|voile)/.test(`${text} ${categoryName}`)) {
        blocks[0].templates.push(template);
        return;
      }

      if (/(depannage|plomberie|electricite|chauffage|sanitaire|reparation|installation|remplacement|urgence)/.test(`${text} ${categoryName}`)) {
        blocks[1].templates.push(template);
        return;
      }

      if (/(renovation|peinture|carrelage|faience|menuiserie|revetement|finition|amenagement|decoration|pose)/.test(`${text} ${categoryName}`)) {
        blocks[2].templates.push(template);
        return;
      }

      blocks[3].templates.push(template);
    };

    serviceTemplates.forEach(assignTemplate);

    return blocks.map((block) => ({
      ...block,
      templates: block.templates.slice(0, 8),
    }));
  }, [serviceTemplates]);

  const saveServiceTemplate = async (template: { id: string; name: string; category: string; unit: string; defaultPrice: number }) => {
    const draft = serviceTemplateDrafts[template.id] ?? {
      description: `${template.category} - prix ajusté par l'artisan`,
      price: String(template.defaultPrice),
      isActive: true,
    };
    const priceValue = Number(draft.price ?? template.defaultPrice);
    const normalizedPrice = Number.isFinite(priceValue) && priceValue > 0 ? priceValue : template.defaultPrice;
    const descriptionValue = (draft.description || `${template.category} - prix ajusté par l'artisan`).trim();
    const existing = services.find((service) => {
      const nameMatch = (service.name || "").toLowerCase() === template.name.toLowerCase();
      const categoryMatch = (service.serviceCategory || "").toLowerCase() === template.category.toLowerCase();
      return nameMatch && categoryMatch;
    });

    try {
      const payload = {
        name: template.name,
        description: descriptionValue || `${template.category} - prix ajusté par l'artisan`,
        unit: template.unit,
        unitPrice: normalizedPrice,
        serviceCategory: template.category,
        isActive: draft.isActive,
      };

      const res = existing
        ? await fetch(`/api/user/services/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ...payload, serviceCategory: template.category }),
          })
        : await fetch("/api/user/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'enregistrement");
      }

      await fetchServices();
      alert("✅ Prestation enregistrée");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  // Redirection si non authentifié
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.push("/login");
    }
  }, [session, sessionStatus, router]);

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================
  const fetchServices = async () => {
    try {
      const res = await fetch("/api/user/services", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement services");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Erreur chargement services :", error);
    }
  };

  const fetchCatalogs = async () => {
    setCatalogsLoading(true);
    try {
      const res = await fetch("/api/seller/catalogs", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement catalogues");
      const data = await res.json();
      setCatalogs(data);
    } catch (error) {
      console.error("Erreur chargement catalogues :", error);
    } finally {
      setCatalogsLoading(false);
    }
  };

  const fetchUserAgents = async () => {
    setUserAgentsLoading(true);
    try {
      const res = await fetch("/api/user/agents?detail=true", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement agents");
      const data = await res.json();
      setUserAgents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement agents :", error);
      setUserAgents([]);
    } finally {
      setUserAgentsLoading(false);
    }
  };

  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const res = await fetch("/api/user/teams", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement equipes");
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement equipes :", error);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    const loadPageData = async () => {
      try {
        const profile = await fetch("/api/user/profile", { credentials: "include" });
        const profileData = await profile.json();
        const detectedProfileType = profileData.profileType || profileData.role || session?.user?.role || "artisan";
        const detectedTrade = profileData.trade || session?.user?.trade || "";

        setFormData({
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          dateOfBirth: profileData.dateOfBirth || profileData.birthDate || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
          companyName: profileData.companyName || "",
          brandColor: profileData.brandColor || "#1E40AF",
          logoUrl: profileData.logoUrl || "",
          trade: detectedTrade,
          profileType: detectedProfileType,
        });
      } catch (err) {
        console.error("Erreur chargement profil:", err);
      }

      await Promise.allSettled([
        fetch("/api/user/services", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : []))
          .then(setServices)
          .catch(() => {}),
        fetch("/api/user/service-types", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : []))
          .then(setServiceTypes)
          .catch(() => {}),
        fetch("/api/user/agents", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : []))
          .then(setUserAgents)
          .catch(() => {}),
        fetch("/api/user/teams", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : []))
          .then(setTeams)
          .catch(() => {}),
      ]);
    };

    void loadPageData();
  }, [session]);

  useEffect(() => {
    if (!isVendeur) return;
    const loadCatalogs = async () => {
      const res = await fetch("/api/seller/catalogs", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setCatalogs(data);
    };
    void loadCatalogs();
  }, [isVendeur]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[0-9\s().-]{8,20}$/;

    if (!formData.email.trim() || !emailPattern.test(formData.email.trim())) {
      alert("Veuillez saisir une adresse e-mail valide.");
      setLoading(false);
      return;
    }

    if (formData.phone.trim() && !phonePattern.test(formData.phone.trim())) {
      alert("Veuillez saisir un numéro de téléphone valide.");
      setLoading(false);
      return;
    }

    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      if (Number.isNaN(birthDate.getTime())) {
        alert("Veuillez saisir une date de naissance valide.");
        setLoading(false);
        return;
      }
    }

    try {
      const normalizedProfileType = (formData.profileType || resolvedProfileType || "artisan").toLowerCase();
      const computedAge = calculateAge(formData.dateOfBirth);

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim() || formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          age: computedAge ?? null,
          dateOfBirth: formData.dateOfBirth || null,
          companyName: formData.companyName,
          brandColor: formData.brandColor,
          logoUrl: formData.logoUrl,
          trade: formData.trade || detectedTrade || "",
          profileType: normalizedProfileType,
          role: normalizedProfileType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      alert("✅ Paramètres mis à jour !");
      router.refresh();
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.type)) {
      alert("Format non supporté. Utilisez JPG, PNG, WEBP ou SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier ne doit pas dépasser 2 Mo.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur upload");
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, logoUrl: data.url }));
      alert("✅ Logo uploadé avec succès !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isManualService = serviceForm.serviceTypeId === "__manual";
      if (isManualService && !serviceForm.serviceCategory.trim()) {
        throw new Error("Veuillez saisir la catégorie ou le type de votre prestation.");
      }
      const url = editingService ? `/api/user/services/${editingService.id}` : "/api/user/services";
      const method = editingService ? "PUT" : "POST";

      const finalServiceCategory = [
        serviceForm.buildingType && serviceForm.buildingType !== "Tous" ? serviceForm.buildingType : null,
        serviceForm.serviceCategory || generatedServiceCategory,
      ].filter(Boolean).join(" - ");

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceTypeId: isManualService ? "" : serviceForm.serviceTypeId,
          name: generatedServiceName,
          description: serviceForm.description || null,
          unit: serviceForm.unit,
          unitPrice: parseFloat(serviceForm.unitPrice),
          serviceCategory: finalServiceCategory,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchServices();
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({
        serviceTypeId: "",
        description: "",
        unit: "m²",
        unitPrice: "",
        serviceCategory: "",
        buildingType: "Maison individuelle",
        projectType: "",
        workType: "",
        surface: "",
      });
      alert(editingService ? "✅ Prestation mise à jour !" : "✅ Prestation créée !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/user/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: teamForm.name.trim(),
          specialty: teamForm.specialty.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création équipe");
      setTeamForm({ name: "", specialty: "" });
      await fetchTeams();
      alert("✅ Équipe créée !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const handleTeamMemberSubmit = async (teamId: string) => {
    const form = teamMemberForms[teamId] || { userId: "", email: "", phone: "", role: "MEMBER" };
    try {
      const payload: Record<string, string> = { role: form.role };
      if (form.userId.trim()) payload.userId = form.userId.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();

      const res = await fetch(`/api/user/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur ajout membre");
      setTeamMemberForms((prev) => ({ ...prev, [teamId]: { userId: "", email: "", phone: "", role: "MEMBER" } }));
      await fetchTeams();
      alert("✅ Membre ajouté à l’équipe.");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const handleTeamAgentSubmit = async (teamId: string) => {
    const userAgentId = teamAgentForms[teamId] || "";
    if (!userAgentId) {
      alert("Sélectionnez un agent à affecter.");
      return;
    }

    try {
      const res = await fetch(`/api/user/teams/${teamId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userAgentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur affectation agent");
      setTeamAgentForms((prev) => ({ ...prev, [teamId]: "" }));
      await fetchTeams();
      alert("✅ Agent affecté à l’équipe.");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const handleTeamMemberRoleUpdate = async (teamId: string, membershipId: string, role: string) => {
    try {
      const res = await fetch(`/api/user/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ membershipId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur mise à jour role");
      await fetchTeams();
      alert("✅ Rôle du membre mis à jour.");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const handleTeamMemberDelete = async (teamId: string, membershipId: string) => {
    try {
      const res = await fetch(`/api/user/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ membershipId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur retrait membre");
      await fetchTeams();
      alert("✅ Membre retiré de l’équipe.");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const handleTeamAgentDelete = async (teamId: string, teamAgentId: string) => {
    try {
      const res = await fetch(`/api/user/teams/${teamId}/agents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ teamAgentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur retrait agent");
      await fetchTeams();
      alert("✅ Agent retiré de l’équipe.");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  // ============================================================
  // CATALOGUES
  // ============================================================
  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCatalog ? `/api/seller/catalogs/${editingCatalog.id}` : "/api/seller/catalogs";
      const method = editingCatalog ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: catalogForm.name.trim(),
          description: catalogForm.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchCatalogs();
      setShowCatalogModal(false);
      setEditingCatalog(null);
      setCatalogForm({ name: "", description: "" });
      alert(editingCatalog ? "✅ Catalogue mis à jour !" : "✅ Catalogue créé !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const deleteCatalog = async (catalog: Catalog) => {
    if (catalog.productCount > 0) {
      alert(`Impossible de supprimer ce catalogue : il contient ${catalog.productCount} produit(s).`);
      return;
    }
    if (!confirm(`Supprimer définitivement le catalogue "${catalog.name}" ?`)) return;
    setDeletingCatalogId(catalog.id);
    try {
      const res = await fetch(`/api/seller/catalogs/${catalog.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchCatalogs();
      alert("✅ Catalogue supprimé !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    } finally {
      setDeletingCatalogId(null);
    }
  };

  const openEditCatalogModal = (catalog: Catalog) => {
    setEditingCatalog(catalog);
    setCatalogForm({
      name: catalog.name,
      description: catalog.description || "",
    });
    setShowCatalogModal(true);
  };

  const openCreateCatalogModal = () => {
    setEditingCatalog(null);
    setCatalogForm({ name: "", description: "" });
    setShowCatalogModal(true);
  };

  // ============================================================
  // AGENTS UTILISATEUR
  // ============================================================
  const cancelAgent = async (userAgentId: string) => {
    if (!confirm("Voulez-vous vraiment résilier cet agent ? Vous perdrez l'accès à ses fonctionnalités.")) return;
    setCancellingAgentId(userAgentId);
    try {
      const res = await fetch("/api/user/agents/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userAgentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      await fetchUserAgents();
      alert("✅ Agent résilié avec succès !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    } finally {
      setCancellingAgentId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      TRIAL: { label: "Essai gratuit", color: "bg-blue-100 text-blue-700" },
      ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
      CANCELLED: { label: "Résilié", color: "bg-gray-100 text-gray-600" },
      EXPIRED: { label: "Expiré", color: "bg-red-100 text-red-700" },
      PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
    };
    return map[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case "artisan":
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case "vendeur":
        return <Store className="w-5 h-5 text-blue-500" />;
      case "societe":
        return <Building2 className="w-5 h-5 text-purple-500" />;
      default:
        return <Building2 className="w-5 h-5 text-gray-500" />;
    }
  };

  const toggleServiceStatus = async (service: UserService) => {
    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      if (!res.ok) throw new Error("Erreur");
      await fetchServices();
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const deleteService = async (service: UserService) => {
    if (service.isDefault) {
      alert("Impossible de supprimer une prestation par défaut.");
      return;
    }
    if (!confirm(`Supprimer "${service.name}" ?`)) return;
    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      await fetchServices();
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const startInlineServiceEdit = (service: UserService) => {
    setEditingServiceId(service.id);
    setInlineServiceForm({
      description: service.description || "",
      unitPrice: String(service.unitPrice),
    });
  };

  const cancelInlineServiceEdit = () => {
    setEditingServiceId(null);
    setInlineServiceForm({ description: "", unitPrice: "" });
  };

  const saveInlineServiceEdit = async (service: UserService) => {
    const unitPrice = Number(inlineServiceForm.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      alert("Le prix unitaire doit être supérieur à 0.");
      return;
    }

    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: inlineServiceForm.description.trim() || null,
          unitPrice,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la mise à jour");
      }

      await fetchServices();
      cancelInlineServiceEdit();
      alert("✅ Prestation mise à jour !");
    } catch (error) {
      alert("Erreur : " + (error as Error).message);
    }
  };

  const openCreateModal = () => {
    setEditingService(null);
    setServiceForm({
      serviceTypeId: serviceTypes[0]?.id || "",
      description: "",
      unit: serviceTradeRules.units[0] || "m²",
      unitPrice: "",
      serviceCategory: "",
      buildingType: "Maison individuelle",
      projectType: serviceTradeRules.projectTypes[0] || "",
      workType: serviceTradeRules.workTypes[0]?.value || "",
      surface: serviceTradeRules.surfaces[0] || "",
    });
    setShowServiceModal(true);
  };

  // ============================================================
  // RENDU
  // ============================================================
  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Veuillez vous connecter</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ {dict.settings.title}</h1>

      {/* ============================================================
           1. MES AGENTS
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">🤖 Mes agents</h2>
          <button
            onClick={() => router.push("/abonnement")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter un agent
          </button>
        </div>

        {userAgentsLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : userAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Crown className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Aucun agent actif.</p>
            <p className="text-sm">Souscrivez à un abonnement pour accéder à vos fonctionnalités.</p>
            <button
              onClick={() => router.push("/abonnement")}
              className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Voir les offres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {userAgents.map((ua, index) => {
              const agentMeta = ua.agent ?? { name: ua.customName || "Agent", type: "vendeur" };
              const agentName = ua.customName || agentMeta.name || "Agent";
              const agentType = agentMeta.type || "vendeur";
              const statusInfo = getStatusLabel(ua.status);
              const endDate = ua.status === "TRIAL" ? ua.trialEndDate : ua.endDate;
              const palette = [
                "from-blue-50 to-blue-100 border-blue-200",
                "from-violet-50 to-violet-100 border-violet-200",
                "from-emerald-50 to-emerald-100 border-emerald-200",
                "from-amber-50 to-amber-100 border-amber-200",
                "from-rose-50 to-rose-100 border-rose-200",
                "from-cyan-50 to-cyan-100 border-cyan-200",
              ];

              return (
                <div
                  key={ua.id}
                  className={`bg-gradient-to-br ${palette[index % palette.length]} border rounded-2xl p-4 shadow-sm`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/80 rounded-lg p-2 shadow-sm">{getAgentIcon(agentType)}</div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{agentName}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{agentType}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Rôle</span>
                      <span className="font-medium">{agentType}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Valable</span>
                      <span className="font-medium">{endDate ? new Date(endDate).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                  {(ua.status === "TRIAL" || ua.status === "ACTIVE") && (
                    <button
                      onClick={() => cancelAgent(ua.id)}
                      disabled={cancellingAgentId === ua.id}
                      className="mt-4 w-full text-sm bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {cancellingAgentId === ua.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Annulation...
                        </span>
                      ) : (
                        "Annuler"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">🛠️ Mes prestations</h2>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter une prestation
            </button>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
            Les prix sont des estimations de départ : merci de les ajuster selon votre réalité de marché et votre marge.
          </div>

          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              Filtrer selon le type de bâtiment
            </div>
            <select
              value={buildingTypeFilter}
              onChange={(e) => setBuildingTypeFilter(e.target.value as (typeof buildingTypeOptions)[number])}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              {buildingTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-blue-800">Prestations disponibles</h3>
              <span className="text-xs text-blue-700">{serviceTemplates.length} propositions</span>
            </div>

            <div className="space-y-5">
              {prestationBlocks.map((block) => (
                <div key={block.key} className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-semibold text-slate-800">{block.title}</h4>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {block.templates.length}
                    </span>
                  </div>

                  <div className="mb-2 rounded-md px-2 py-1 text-[10px] font-medium">
                    {block.key === "gros-oeuvre" && <span className="bg-stone-100 text-stone-700">Catégorie : Gros œuvre</span>}
                    {block.key === "depannage" && <span className="bg-amber-100 text-amber-700">Catégorie : Dépannage</span>}
                    {block.key === "renovation" && <span className="bg-emerald-100 text-emerald-700">Catégorie : Rénovation</span>}
                    {block.key === "reste" && <span className="bg-slate-200 text-slate-700">Catégorie : Le reste</span>}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {block.templates.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucune prestation</p>
                    ) : (
                      block.templates.map((template) => {
                        const draft = serviceTemplateDrafts[template.id] ?? {
                          description: `${template.category} - prix ajusté par l'artisan`,
                          price: String(template.defaultPrice),
                          isActive: true,
                        };

                        return (
                          <div key={template.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                            <div className="mb-2 min-w-0">
                              <p className="text-xs font-medium text-slate-900">{template.name}</p>
                              <p className="text-[10px] text-slate-500">{template.category} · {template.unit}</p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[10px] font-medium text-slate-600">Description</label>
                              <input
                                type="text"
                                value={draft.description}
                                onChange={(e) => setServiceTemplateDrafts((prev) => ({
                                  ...prev,
                                  [template.id]: {
                                    description: e.target.value,
                                    price: prev[template.id]?.price ?? String(template.defaultPrice),
                                    isActive: prev[template.id]?.isActive ?? true,
                                  },
                                }))}
                                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
                                placeholder="Description de la prestation"
                              />

                              <div className="flex items-center gap-2">
                                <label className="block text-[10px] font-medium text-slate-600">Prix</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.price}
                                  onChange={(e) => setServiceTemplateDrafts((prev) => ({
                                    ...prev,
                                    [template.id]: {
                                      description: prev[template.id]?.description ?? `${template.category} - prix ajusté par l'artisan`,
                                      price: e.target.value,
                                      isActive: prev[template.id]?.isActive ?? true,
                                    },
                                  }))}
                                  className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
                                />
                              </div>

                              <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                                <div className="mb-1 text-[10px] font-medium text-slate-600">Statut</div>
                                <div className="flex items-center gap-3 text-[10px]">
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="radio"
                                      name={`service-status-${template.id}`}
                                      checked={draft.isActive}
                                      onChange={() => setServiceTemplateDrafts((prev) => ({
                                        ...prev,
                                        [template.id]: {
                                          description: prev[template.id]?.description ?? `${template.category} - prix ajusté par l'artisan`,
                                          price: prev[template.id]?.price ?? String(template.defaultPrice),
                                          isActive: true,
                                        },
                                      }))}
                                    />
                                    Activer
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="radio"
                                      name={`service-status-${template.id}`}
                                      checked={!draft.isActive}
                                      onChange={() => setServiceTemplateDrafts((prev) => ({
                                        ...prev,
                                        [template.id]: {
                                          description: prev[template.id]?.description ?? `${template.category} - prix ajusté par l'artisan`,
                                          price: prev[template.id]?.price ?? String(template.defaultPrice),
                                          isActive: false,
                                        },
                                      }))}
                                    />
                                    Désactiver
                                  </label>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => saveServiceTemplate(template)}
                                className="mt-2 w-full rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{buildingTypeFilter === "Tous" ? "Aucune prestation configurée." : "Aucune prestation correspondante à ce type de bâtiment."}</p>
              <p className="text-sm">Ajoutez vos prestations pour qu&apos;elles apparaissent dans vos devis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unité</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service) => {
                    const isEditing = editingServiceId === service.id;

                    return (
                      <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 text-sm">
                          {service.name}
                          {service.isDefault && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Par défaut</span>
                          )}
                          {service.serviceCategory && (
                            <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                              {service.serviceCategory}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {isEditing ? (
                            <input
                              type="text"
                              value={inlineServiceForm.description}
                              onChange={(e) => setInlineServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                              className="w-full min-w-[180px] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                              placeholder="Description de la prestation"
                            />
                          ) : (
                            service.description || "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{service.serviceType?.label || "—"}</td>
                        <td className="px-4 py-3 text-sm">{service.unit}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-yellow-800 bg-yellow-50">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={inlineServiceForm.unitPrice}
                              onChange={(e) => setInlineServiceForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                              className="w-24 rounded-md border border-yellow-300 bg-yellow-50 px-2 py-1.5 text-sm text-yellow-900"
                            />
                          ) : (
                            `${service.unitPrice.toFixed(2)} €`
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => toggleServiceStatus(service)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition ${service.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                          >
                            {service.isActive ? "Actif" : "Inactif"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => saveInlineServiceEdit(service)}
                                className="text-green-600 hover:text-green-800"
                                title="Enregistrer les modifications"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 inline fill-current" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                              </button>
                              <button
                                type="button"
                                onClick={cancelInlineServiceEdit}
                                className="text-gray-500 hover:text-gray-700"
                                title="Annuler"
                              >
                                <X className="w-4 h-4 inline" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startInlineServiceEdit(service)} className="text-blue-600 hover:text-blue-800" title="Modifier la description et le prix">
                                <Edit className="w-4 h-4 inline" />
                              </button>
                              <button
                                onClick={() => deleteService(service)}
                                className={`${service.isDefault ? "text-gray-300 cursor-not-allowed" : "text-red-600 hover:text-red-800"}`}
                                disabled={service.isDefault}
                                title={service.isDefault ? "Impossible de supprimer une prestation par défaut" : ""}
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* ============================================================
           3. INFORMATIONS DU PROFIL (MODIFIABLE - sans Type de profil ni Spécialité)
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">👤 Informations du profil</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.settings.firstName}</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.settings.lastName}</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.settings.email}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.settings.phone}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.settings.companyName}</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">{dict.settings.brandColor}</label>
            <input
              type="color"
              value={formData.brandColor}
              onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
              className="w-full h-12 p-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">{dict.settings.logo}</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="flex-1 p-2 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && <span className="text-sm text-gray-500">⏳ Upload...</span>}
            </div>
            {formData.logoUrl && (
              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Aperçu :</p>
                <div className="max-h-20 overflow-hidden rounded border border-gray-200 bg-white">
                  <Image
                    src={formData.logoUrl}
                    alt="Logo"
                    width={160}
                    height={80}
                    unoptimized
                    className="max-h-20 w-auto object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer les paramètres"}
          </button>
        </form>
      </div>

      {/* ============================================================
           4. MON ORGANISATION
      ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">🏢 Mon organisation</h2>

        <form onSubmit={handleTeamSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={teamForm.name}
            onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nom de l'équipe"
            className="px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="text"
            value={teamForm.specialty}
            onChange={(e) => setTeamForm((prev) => ({ ...prev, specialty: e.target.value }))}
            placeholder="Métier / spécialité"
            className="px-3 py-2 border rounded-lg"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Créer une équipe
          </button>
        </form>

        {teamsLoading ? (
          <div className="text-sm text-gray-500">Chargement des équipes...</div>
        ) : teams.length === 0 ? (
          <div className="text-sm text-gray-500">Aucune équipe créée pour le moment.</div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <div key={team.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{team.name}</h3>
                    {team.specialty && <p className="text-xs text-slate-500">{team.specialty}</p>}
                  </div>
                  <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-1 text-slate-600">
                    {team.members?.length || 0} membre(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Ajouter un membre</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={teamMemberForms[team.id]?.userId || ""}
                        onChange={(e) =>
                          setTeamMemberForms((prev) => ({
                            ...prev,
                            [team.id]: {
                              ...(prev[team.id] || { userId: "", email: "", phone: "", role: "MEMBER" }),
                              userId: e.target.value,
                            },
                          }))
                        }
                        placeholder="userId (optionnel)"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="email"
                        value={teamMemberForms[team.id]?.email || ""}
                        onChange={(e) =>
                          setTeamMemberForms((prev) => ({
                            ...prev,
                            [team.id]: {
                              ...(prev[team.id] || { userId: "", email: "", phone: "", role: "MEMBER" }),
                              email: e.target.value,
                            },
                          }))
                        }
                        placeholder="Email"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="tel"
                        value={teamMemberForms[team.id]?.phone || ""}
                        onChange={(e) =>
                          setTeamMemberForms((prev) => ({
                            ...prev,
                            [team.id]: {
                              ...(prev[team.id] || { userId: "", email: "", phone: "", role: "MEMBER" }),
                              phone: e.target.value,
                            },
                          }))
                        }
                        placeholder="Téléphone"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <select
                        value={teamMemberForms[team.id]?.role || "MEMBER"}
                        onChange={(e) =>
                          setTeamMemberForms((prev) => ({
                            ...prev,
                            [team.id]: {
                              ...(prev[team.id] || { userId: "", email: "", phone: "", role: "MEMBER" }),
                              role: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="MEMBER">Membre</option>
                        <option value="MANAGER">Manager</option>
                        <option value="VIEWER">Lecteur</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleTeamMemberSubmit(team.id)}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm"
                      >
                        Ajouter le membre
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(team.members || []).map((member) => {
                        const isOwnerMember = team.ownerId === member.user?.id || member.role === "OWNER";
                        return (
                          <div key={member.id} className="rounded-lg bg-slate-100 px-2 py-2 text-xs text-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <span>{member.user?.name || member.user?.email || "Membre"}</span>
                              <span className="font-medium">{member.role}</span>
                            </div>
                            {!isOwnerMember && (
                              <div className="mt-2 flex items-center gap-2">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleTeamMemberRoleUpdate(team.id, member.id, e.target.value)}
                                  className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                                >
                                  <option value="MEMBER">Membre</option>
                                  <option value="MANAGER">Manager</option>
                                  <option value="VIEWER">Lecteur</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleTeamMemberDelete(team.id, member.id)}
                                  className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100"
                                >
                                  Retirer
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Associer un agent IA</h4>
                    <div className="space-y-2">
                      <select
                        value={teamAgentForms[team.id] || ""}
                        onChange={(e) => setTeamAgentForms((prev) => ({ ...prev, [team.id]: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Choisir un agent</option>
                        {userAgents.map((ua) => (
                          <option key={ua.id} value={ua.id}>
                            {ua.customName || ua.agent?.name || "Agent"} ({ua.agent?.type || "assistant"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleTeamAgentSubmit(team.id)}
                        className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                      >
                        Assigner l’agent
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(team.agents || []).map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 px-2 py-2 text-xs text-indigo-700">
                          <span>{agent.userAgent?.agent?.name || "Agent"}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{agent.userAgent?.agent?.type || "assistant"}</span>
                            <button
                              type="button"
                              onClick={() => handleTeamAgentDelete(team.id, agent.id)}
                              className="rounded border border-indigo-200 bg-white px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
           5. GESTION DES CATALOGUES (vendeur uniquement)
      ============================================================ */}
      {isVendeur && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              📂 Gestion des catalogues
            </h2>
            <button
              onClick={openCreateCatalogModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau catalogue
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Un catalogue regroupe vos produits par catégorie. Chaque produit doit être associé à un catalogue.
          </p>

          {catalogsLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement des catalogues...</div>
          ) : catalogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Aucun catalogue créé.</p>
              <p className="text-sm">Créez votre premier catalogue pour commencer à organiser vos produits.</p>
              <button onClick={openCreateCatalogModal} className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Créer un catalogue
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Produits</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Créé le</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogs.map((catalog) => (
                    <tr key={catalog.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{catalog.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">{catalog.description || "—"}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          {catalog.productCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(catalog.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => router.push(`/vendeur?catalog=${catalog.id}`)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                          title="Voir les produits du catalogue"
                        >
                          <ExternalLink className="w-4 h-4 inline" />
                        </button>
                        <button onClick={() => openEditCatalogModal(catalog)} className="text-blue-600 hover:text-blue-800 mr-2">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => deleteCatalog(catalog)}
                          disabled={deletingCatalogId === catalog.id || catalog.productCount > 0}
                          className={`${catalog.productCount > 0 ? "text-gray-300 cursor-not-allowed" : "text-red-600 hover:text-red-800"}`}
                          title={catalog.productCount > 0 ? `Ce catalogue contient ${catalog.productCount} produit(s), impossible de le supprimer.` : "Supprimer le catalogue"}
                        >
                          {deletingCatalogId === catalog.id ? (
                            <Loader2 className="w-4 h-4 animate-spin inline" />
                          ) : (
                            <Trash2 className="w-4 h-4 inline" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
           MODALES (Prestation, Catalogue)
      ============================================================ */}
      {/* MODALE PRESTATION */}
      {showServiceModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowServiceModal(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowServiceModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Fermer la modale"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">
              {editingService ? "Modifier la prestation" : "Ajouter une prestation"}
            </h2>
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type de prestation</label>
                <select
                  value={serviceForm.serviceTypeId}
                  onChange={(e) => setServiceForm({ ...serviceForm, serviceTypeId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  disabled
                >
                  <option value="">Sélectionner un type...</option>
                  <option value="__manual">Saisie manuelle</option>
                  {serviceTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom (auto-généré) *</label>
                <input
                  type="text"
                  readOnly
                  value={generatedServiceName}
                  className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Le nom est généré automatiquement à partir des champs ci-dessous.</p>
              </div>
              {serviceForm.serviceTypeId === "__manual" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie / type personnalisé</label>
                  <input
                    type="text"
                    placeholder="Ex : Pose de parquet, dépannage, livraison..."
                    value={serviceForm.serviceCategory}
                    onChange={(e) => setServiceForm({ ...serviceForm, serviceCategory: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    readOnly
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Type de bâtiment</label>
                <select
                  value={serviceForm.buildingType}
                  onChange={(e) => setServiceForm({ ...serviceForm, buildingType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  disabled
                >
                  {buildingTypeOptions.filter((option) => option !== "Tous").map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type de projet</label>
                <select
                  value={serviceForm.projectType}
                  onChange={(e) => setServiceForm({ ...serviceForm, projectType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  disabled
                >
                  {serviceTradeRules.projectTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type de chantier</label>
                  <select
                    value={serviceForm.workType}
                    onChange={(e) => setServiceForm({ ...serviceForm, workType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    disabled
                  >
                    {serviceTradeRules.workTypes.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Surface / Support</label>
                  <select
                    value={serviceForm.surface}
                    onChange={(e) => setServiceForm({ ...serviceForm, surface: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    disabled
                  >
                    {serviceTradeRules.surfaces.map((surface) => (
                      <option key={surface} value={surface}>{surface}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
                <input
                  type="text"
                  placeholder="Description de la prestation"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Catégorie métier générée : <strong>{generatedServiceCategory}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unité</label>
                <select
                  value={serviceForm.unit}
                  onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  required
                  disabled
                >
                  {serviceTradeRules.units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-700">Prix unitaire (€) à ajuster *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="35.00"
                  value={serviceForm.unitPrice}
                  onChange={(e) => setServiceForm({ ...serviceForm, unitPrice: e.target.value })}
                  className="w-full rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-yellow-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {editingService ? "Mettre à jour" : "Ajouter"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CATALOGUE */}
      {showCatalogModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCatalogModal(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6 relative pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowCatalogModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Fermer la modale"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">
              {editingCatalog ? "Modifier le catalogue" : "Créer un catalogue"}
            </h2>
            <form onSubmit={handleCatalogSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom du catalogue *</label>
                <input
                  type="text"
                  placeholder="Ex: Carrelage, Plomberie, Électricité..."
                  value={catalogForm.name}
                  onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Un nom unique pour ce catalogue.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (optionnelle)</label>
                <textarea
                  placeholder="Décrivez ce catalogue..."
                  value={catalogForm.description}
                  onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {editingCatalog ? "Mettre à jour" : "Créer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
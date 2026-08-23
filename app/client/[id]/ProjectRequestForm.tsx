"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const PROJECT_TYPE_OPTIONS: Record<string, string[]> = {
  carreleur: ["Pose de carrelage sol", "Pose de carrelage mur", "Rénovation salle de bain", "Terrasse extérieure", "Carrelage piscine", "Autre"],
  electricien: ["Installation électrique", "Dépannage", "Rénovation électrique", "Mise aux normes", "Domotique", "Autre"],
  plombier: ["Fuite ou dépannage", "Installation sanitaire", "Chauffage", "Rénovation salle de bain", "Mise aux normes", "Autre"],
  peintre: ["Peinture intérieure", "Peinture extérieure", "Peinture plafond", "Enduit et préparation", "Rénovation", "Autre"],
  menuisier: ["Fenêtre", "Porte", "Cuisine", "Placard", "Escalier", "Autre"],
};

const SPECIALTY_FIELDS: Record<string, { label: string; placeholder: string }[]> = {
  carreleur: [],
  electricien: [{ label: "Éléments concernés", placeholder: "Prises, tableau, éclairage, domotique..." }],
  plombier: [{ label: "Équipement concerné", placeholder: "Douche, lavabo, chaudière, canalisation..." }],
  peintre: [{ label: "État du support", placeholder: "Support neuf, fissures, ancienne peinture..." }],
  menuisier: [{ label: "Dimensions ou contraintes", placeholder: "Largeur, hauteur, matériau souhaité..." }],
};

type ProjectRequestFormProps = {
  artisanId: string;
  artisanName: string;
  trade?: string;
  availableTrades?: string[];
  broadcastMode?: boolean;
  defaultValues: {
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    clientAddress: string;
    projectName: string;
    projectType: string;
    customProjectType: string;
    workType: string;
    description: string;
    solLongueur: string;
    solLargeur: string;
    solSurface: string;
    murLongueur: string;
    murHauteur: string;
    nbMurs: string;
    murSurface: string;
    surface: string;
    budgetEstimate: string;
    specialtyDetails: string;
  };
};

export default function ProjectRequestForm({
  artisanId,
  artisanName,
  trade = "carreleur",
  availableTrades,
  broadcastMode = false,
  defaultValues,
}: ProjectRequestFormProps) {
  const { data: session } = useSession();
  const [form, setForm] = useState(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [partnershipSubmitting, setPartnershipSubmitting] = useState(false);
  const [partnershipMessage, setPartnershipMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ projectId: string; publicUrl: string; pin: string } | null>(null);
  const normalizedAvailableTrades = useMemo(() => {
    const baseTrades = [trade, ...(availableTrades || [])]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);

    return Array.from(new Set(baseTrades));
  }, [availableTrades, trade]);

  const [enabledTradeProducts, setEnabledTradeProducts] = useState<Record<string, boolean>>({});
  const [productSearchByTrade, setProductSearchByTrade] = useState<Record<string, string>>({});
  const [productCategoryByTrade, setProductCategoryByTrade] = useState<Record<string, string>>({});
  const [selectedProductByTrade, setSelectedProductByTrade] = useState<Record<string, string>>({});
  const [productsByTrade, setProductsByTrade] = useState<Record<string, Array<{
    id: string;
    name: string;
    category: string;
    brand: string | null;
    salePrice: number;
    stock: number;
    imageUrl: string | null;
    user: { id: string; companyName: string | null; name: string };
  }>>>({});
  const [productRows, setProductRows] = useState<Array<{
    id: string;
    trade: string;
    name: string;
    category: string;
    brand: string | null;
    quantity: number;
    salePrice: number;
    imageUrl: string | null;
    sellerId: string;
    sellerName: string;
  }>>([]);

  useEffect(() => {
    const nextState: Record<string, boolean> = {};
    for (const tradeKey of normalizedAvailableTrades) {
      nextState[tradeKey] = false;
    }
    setEnabledTradeProducts(nextState);
  }, [normalizedAvailableTrades]);

  const activeTrades = useMemo(
    () => normalizedAvailableTrades.filter((tradeKey) => enabledTradeProducts[tradeKey]),
    [enabledTradeProducts, normalizedAvailableTrades]
  );

  const computeSuggestedQuantity = (category: string, totalSurface: number) => {
    if (!totalSurface || totalSurface <= 0) return 1;

    if (/carreau|carrelage|faience|faïence/i.test(category)) {
      return Math.max(1, Math.ceil(totalSurface * 1.1));
    }

    if (/colle|joint|enduit|peinture/i.test(category)) {
      return Math.max(1, Math.ceil(totalSurface));
    }

    return Math.max(1, Math.ceil(totalSurface / 5));
  };

  const addProductRow = (tradeKey: string) => {
    const productId = selectedProductByTrade[tradeKey] || '';
    const category = productCategoryByTrade[tradeKey] || '';
    const products = productsByTrade[tradeKey] || [];
    const selectedProduct = products.find((product) => product.id === productId && product.category === category);

    if (!selectedProduct) {
      setError('Sélectionnez un produit valide dans la catégorie choisie.');
      return;
    }

    setProductRows((prev) => {
      if (prev.some((row) => row.id === selectedProduct.id && row.trade === tradeKey)) {
        return prev;
      }

      return [
        ...prev,
        {
          id: selectedProduct.id,
          trade: tradeKey,
          name: selectedProduct.name,
          category: selectedProduct.category,
          brand: selectedProduct.brand,
          quantity: computeSuggestedQuantity(selectedProduct.category, computedTotalSurface),
          salePrice: selectedProduct.salePrice,
          imageUrl: selectedProduct.imageUrl,
          sellerId: selectedProduct.user.id,
          sellerName: selectedProduct.user.companyName || selectedProduct.user.name,
        },
      ];
    });

    setError(null);
  };

  const removeProductRow = (tradeKey: string, productId: string) => {
    setProductRows((prev) => prev.filter((row) => !(row.trade === tradeKey && row.id === productId)));
  };

  const toggleTradeProducts = (tradeKey: string, enabled: boolean) => {
    setEnabledTradeProducts((prev) => ({ ...prev, [tradeKey]: enabled }));

    if (!enabled) {
      setProductRows((prev) => prev.filter((row) => row.trade !== tradeKey));
      setProductSearchByTrade((prev) => ({ ...prev, [tradeKey]: '' }));
      setProductCategoryByTrade((prev) => ({ ...prev, [tradeKey]: '' }));
      setSelectedProductByTrade((prev) => ({ ...prev, [tradeKey]: '' }));
    }
  };
  const projectTypeOptions = PROJECT_TYPE_OPTIONS[trade] ?? ["Demande de prestation", "Rénovation", "Installation", "Autre"];
  const specialtyFields = SPECIALTY_FIELDS[trade] ?? [{ label: "Précisions métier", placeholder: "Ajoutez les informations utiles au professionnel..." }];

  useEffect(() => {
    const loadProducts = async () => {
      for (const tradeKey of activeTrades) {
        try {
          const searchValue = productSearchByTrade[tradeKey] || '';
          const response = await fetch(`/api/public/products?trade=${encodeURIComponent(tradeKey)}&q=${encodeURIComponent(searchValue)}`);
          const data = await response.json();

          if (!response.ok) {
            continue;
          }

          const list = Array.isArray(data) ? data : [];
          setProductsByTrade((prev) => ({ ...prev, [tradeKey]: list }));

          if (!productCategoryByTrade[tradeKey] && list.length > 0) {
            setProductCategoryByTrade((prev) => ({ ...prev, [tradeKey]: list[0].category }));
          }
        } catch (loadError) {
          console.error('Erreur chargement produits vendeurs:', loadError);
        }
      }
    };

    void loadProducts();
  }, [activeTrades, productCategoryByTrade, productSearchByTrade]);

  const budgetHint = useMemo(() => {
    const value = Number(form.budgetEstimate || 0);
    if (!value) return "Indiquez votre budget pour obtenir une estimation.";
    if (value < 1000) return "Votre budget est assez bas pour ce type de projet. Il peut être intéressant d’ajuster la surface ou les options.";
    if (value > 5000) return "Votre budget est élevé pour ce type de projet. Vous pouvez viser une solution plus premium.";
    return "Votre budget est dans la fourchette attendue pour ce type de projet.";
  }, [form.budgetEstimate]);

  const isSolProject = /sol/i.test(form.projectType);
  const isMurProject = /mur/i.test(form.projectType);
  const isSurfaceProject = /terrasse|piscine|rénovation|renovation|peinture|façade|facade/i.test(form.projectType);
  const hasDimensionFields = isSolProject || isMurProject || isSurfaceProject;
  const effectiveProjectType = form.projectType === "Autre" ? (form.customProjectType || "Autre") : form.projectType;

  const computedSolSurface = isSolProject
    ? Number(form.solLongueur || 0) * Number(form.solLargeur || 0)
    : Number(form.solSurface || 0);

  const computedMurSurface = isMurProject
    ? Number(form.murLongueur || 0) * Number(form.murHauteur || 0) * (Number(form.nbMurs || 0) || 1)
    : Number(form.murSurface || 0);

  const genericSurfaceFromDimensions = Number(form.solLongueur || 0) * Number(form.solLargeur || 0);

  const computedTotalSurface =
    hasDimensionFields && Number(form.surface || 0) > 0
      ? Number(form.surface)
      : isSolProject
        ? computedSolSurface
        : isMurProject
          ? computedMurSurface
          : Number(form.surface || 0) > 0
            ? Number(form.surface)
            : genericSurfaceFromDimensions;

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const solSurface = isSolProject ? computedSolSurface : 0;
      const murSurface = isMurProject ? computedMurSurface : 0;
      const totalSurface = computedTotalSurface > 0 ? computedTotalSurface : null;
      const sanitizedProjectType = effectiveProjectType.trim();

      const payload = {
        artisanId,
        professionalRole: "artisan",
        professionalTrade: trade,
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail,
        clientAddress: form.clientAddress,
        projectName: form.projectName,
        projectType: sanitizedProjectType,
        workType: form.workType || null,
        description: form.description,
        surface: Number.isFinite(totalSurface as number) && totalSurface && totalSurface > 0 ? totalSurface : null,
        budgetEstimate: form.budgetEstimate ? Number(form.budgetEstimate) : null,
        details: {
          description: form.description,
          sol: {
            longueur: form.solLongueur ? Number(form.solLongueur) : null,
            largeur: form.solLargeur ? Number(form.solLargeur) : null,
            surface: solSurface > 0 ? solSurface : null,
          },
          mur: {
            nbMurs: form.nbMurs ? Number(form.nbMurs) : null,
            longueur: form.murLongueur ? Number(form.murLongueur) : null,
            hauteur: form.murHauteur ? Number(form.murHauteur) : null,
            surface: murSurface > 0 ? murSurface : null,
          },
          specialtyDetails: form.specialtyDetails,
          products: {
            activeTrades,
            selected: productRows
              .filter((row) => activeTrades.includes(row.trade))
              .map((row) => ({
                productId: row.id,
                sellerId: row.sellerId,
                trade: row.trade,
                name: row.name,
                brand: row.brand,
                category: row.category,
                quantity: row.quantity,
                unit: 'unité',
                seller: row.sellerName,
                salePrice: row.salePrice,
                imageUrl: row.imageUrl,
              })),
            manual: null,
          },
        },
      };

      const res = await fetch("/api/public/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de créer votre demande de devis.");
      }

      setResult({
        projectId: data.projectId,
        publicUrl: data.publicUrl,
        pin: data.pin,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartnershipRequest = async () => {
    if (!session?.user?.id) {
      setPartnershipMessage("Vous devez être connecté pour demander un partenariat.");
      return;
    }

    try {
      setPartnershipSubmitting(true);
      setError(null);
      setPartnershipMessage(null);

      const res = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: artisanId,
          targetRole: "artisan",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible d’envoyer la demande de partenariat.");
      }

      setPartnershipMessage("Votre demande de partenariat a bien été envoyée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setPartnershipSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">1. Coordonnées</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nom</label>
              <input
                required
                value={form.clientName}
                onChange={(e) => handleChange("clientName", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Téléphone</label>
              <input
                required
                value={form.clientPhone}
                onChange={(e) => handleChange("clientPhone", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="+33 6 ..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">E-mail</label>
              <input
                type="email"
                required
                value={form.clientEmail}
                onChange={(e) => handleChange("clientEmail", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Adresse</label>
              <input
                required
                value={form.clientAddress}
                onChange={(e) => handleChange("clientAddress", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Votre adresse"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">2. Projet</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nom du projet</label>
              <input
                required
                value={form.projectName}
                onChange={(e) => handleChange("projectName", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : Salle de bain, terrasse, pose sol..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Type de projet</label>
              <select
                value={form.projectType}
                onChange={(e) => handleChange("projectType", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
              >
                {projectTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Type de chantier</label>
              <select
                value={form.workType}
                onChange={(e) => handleChange("workType", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="">Choisir un type</option>
                <option value="refresh">Rafraîchissement / pose sur support existant</option>
                <option value="renovation">Rénovation complète / préparation</option>
              </select>
            </div>

            {form.projectType === "Autre" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Précisez votre projet</label>
                <input
                  value={form.customProjectType}
                  onChange={(e) => handleChange("customProjectType", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Ex : pose de pierre naturelle, façade, mur de garage..."
                />
              </div>
            )}
          </div>
        </section>

        {specialtyFields.length > 0 && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Informations pour {trade}</h3>
            <div className="space-y-4">
              {specialtyFields.map((field) => (
                <div key={field.label}>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{field.label}</label>
                  <textarea
                    required
                    value={form.specialtyDetails}
                    onChange={(e) => handleChange("specialtyDetails", e.target.value)}
                    className="min-h-24 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">3. Dimensions et surface</h3>

        {isSolProject && (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Longueur (m)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.solLongueur}
                onChange={(e) => handleChange("solLongueur", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 5"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Largeur (m)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.solLargeur}
                onChange={(e) => handleChange("solLargeur", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 4"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Surface calculée (m²)</label>
              <input
                type="number"
                readOnly
                value={computedSolSurface > 0 ? computedSolSurface.toFixed(2) : ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-800 outline-none"
                placeholder="Auto"
              />
            </div>
          </div>
        )}

        {isMurProject && (
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Longueur (m)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.murLongueur}
                onChange={(e) => handleChange("murLongueur", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 8"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Hauteur (m)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.murHauteur}
                onChange={(e) => handleChange("murHauteur", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 2,5"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre de murs</label>
              <input
                type="number"
                min="0"
                value={form.nbMurs}
                onChange={(e) => handleChange("nbMurs", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Surface calculée (m²)</label>
              <input
                type="number"
                readOnly
                value={computedMurSurface > 0 ? computedMurSurface.toFixed(2) : ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-800 outline-none"
                placeholder="Auto"
              />
            </div>
          </div>
        )}

        {isSurfaceProject && !isSolProject && !isMurProject && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Surface concernée (m²)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.surface}
                onChange={(e) => handleChange("surface", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 25"
              />
            </div>
          </div>
        )}

        {!hasDimensionFields && (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Longueur (m)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.solLongueur}
                onChange={(e) => handleChange("solLongueur", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 5"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Largeur (m)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.solLargeur}
                onChange={(e) => handleChange("solLargeur", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : 4"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-blue-800">Surface totale estimée</label>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-blue-800">Total</span>
                  <span className="text-lg font-black text-blue-900">{computedTotalSurface > 0 ? `${computedTotalSurface.toFixed(2)} m²` : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasDimensionFields && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-blue-800">Surface totale estimée</span>
              <span className="text-lg font-black text-blue-900">{computedTotalSurface > 0 ? `${computedTotalSurface.toFixed(2)} m²` : '—'}</span>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Description libre du projet</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            placeholder="Décrivez les contraintes, l’état du support, les objectifs, les remarques ou les besoins particuliers du chantier..."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <h3 className="mb-2 text-lg font-bold text-slate-900">Produits et matériaux par métier (optionnel)</h3>
        <p className="mb-4 text-sm text-slate-600">Activez les métiers souhaités puis choisissez les produits par catégorie. Le prix et la quantité sont calculés automatiquement.</p>

        <div className="space-y-4">
          {normalizedAvailableTrades.map((tradeKey) => {
            const tradeProducts = productsByTrade[tradeKey] || [];
            const selectedCategory = productCategoryByTrade[tradeKey] || '';
            const categories = Array.from(new Set(tradeProducts.map((product) => product.category))).sort((a, b) => a.localeCompare(b));
            const filteredProducts = selectedCategory
              ? tradeProducts.filter((product) => product.category === selectedCategory)
              : tradeProducts;

            return (
              <div key={tradeKey} className="rounded-xl border border-emerald-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-emerald-700">Métier</p>
                    <h4 className="text-base font-bold text-slate-900">{tradeKey}</h4>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(enabledTradeProducts[tradeKey])}
                      onChange={(event) => toggleTradeProducts(tradeKey, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Inclure les produits de ce métier
                  </label>
                </div>

                {enabledTradeProducts[tradeKey] && (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <input
                        type="search"
                        value={productSearchByTrade[tradeKey] || ''}
                        onChange={(event) => setProductSearchByTrade((prev) => ({ ...prev, [tradeKey]: event.target.value }))}
                        placeholder="Rechercher dans ce métier..."
                        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
                      />

                      <select
                        value={selectedCategory}
                        onChange={(event) => {
                          const nextCategory = event.target.value;
                          setProductCategoryByTrade((prev) => ({ ...prev, [tradeKey]: nextCategory }));
                          setSelectedProductByTrade((prev) => ({ ...prev, [tradeKey]: '' }));
                        }}
                        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
                      >
                        <option value="">Catégorie</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>

                      <select
                        value={selectedProductByTrade[tradeKey] || ''}
                        onChange={(event) => setSelectedProductByTrade((prev) => ({ ...prev, [tradeKey]: event.target.value }))}
                        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
                      >
                        <option value="">Produit</option>
                        {filteredProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}{product.brand ? ` - ${product.brand}` : ''} · {product.salePrice.toFixed(2)} €
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => addProductRow(tradeKey)}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Ajouter
                      </button>
                    </div>

                    <p className="text-xs text-slate-500">La quantité est calculée automatiquement selon la surface. Le client ne peut pas modifier le prix ni la quantité.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-3">
          {productRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-white/60 px-4 py-3 text-sm text-slate-600">
              Aucun produit sélectionné pour le moment.
            </div>
          ) : (
            productRows
              .filter((row) => enabledTradeProducts[row.trade])
              .map((productRow) => (
                <div key={`${productRow.trade}-${productRow.id}`} className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {productRow.imageUrl ? (
                      <img src={productRow.imageUrl} alt={productRow.name} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-500">Image</div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{productRow.name}</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{productRow.trade}</span>
                      </div>
                      <p className="text-xs text-slate-500">{productRow.category}{productRow.brand ? ` · ${productRow.brand}` : ''} · {productRow.sellerName}</p>
                      <p className="text-xs text-slate-600">Quantité: {productRow.quantity} · Prix unitaire: {productRow.salePrice.toFixed(2)} €</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProductRow(productRow.trade, productRow.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Retirer
                  </button>
                </div>
              ))
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {partnershipMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {partnershipMessage}
        </div>
      )}

      {result ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Projet créé</div>
          <h3 className="mt-2 text-xl font-bold">Votre demande de devis a bien été enregistrée.</h3>
          <p className="mt-2 text-sm">
            Code PIN projet : <span className="font-black tracking-[0.2em]">{result.pin}</span>
          </p>
          <p className="mt-2 text-sm">
            {broadcastMode
              ? "Les professionnels correspondant à cette spécialité pourront consulter votre demande."
              : "Ce code vous permettra de retrouver votre projet à tout moment."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={result.publicUrl} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Voir mon projet
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Bonjour, voici mon code PIN pour accéder à mon projet : ${result.pin}. Lien : ${result.publicUrl}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Envoyer par WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          {!broadcastMode && (
            <button
              type="button"
              onClick={handlePartnershipRequest}
              disabled={partnershipSubmitting || !session?.user?.id}
              className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {partnershipSubmitting ? "Envoi..." : "Demande partenariat"}
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Envoi..." : broadcastMode ? "Demander un devis à tous" : "Confirmer le devis"}
          </button>
        </div>
      )}
    </form>
  );
}

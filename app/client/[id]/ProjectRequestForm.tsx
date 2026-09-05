"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

// ============================================================
// COMPOSANT D'AIDE (SURVOL)
// ============================================================
const FieldHelp = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <span
      className="relative inline-block ml-1 align-middle"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 hover:bg-blue-200">
        ℹ
      </span>
      {isOpen && (
        <div className="absolute left-0 top-6 z-20 w-64 rounded-lg bg-gray-800 p-2.5 text-xs text-white shadow-lg">
          {children}
        </div>
      )}
    </span>
  );
};

// ============================================================
// TYPES
// ============================================================
type ProjectRequestFormProps = {
  artisanId: string;
  artisanName: string;
  trade?: string;
  availableTrades?: string[];
  broadcastMode?: boolean;
  professionalLabel?: string;
  targetRole?: "all" | "artisan" | "vendeur" | "promoteur";
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

type PieceData = {
  type: string;
  solSurface: string;
  murSurface: string;
  hauteur: string;
  equipements: string[];
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function ProjectRequestForm({
  artisanId,
  trade = "carreleur",
  broadcastMode = false,
  professionalLabel = "professionnel",
  targetRole = "artisan",
  defaultValues,
}: ProjectRequestFormProps) {
  const { data: session } = useSession();
  const resolvedTargetRole = ["all", "artisan", "vendeur", "promoteur"].includes(targetRole || "")
    ? targetRole
    : "artisan";
  const [submitting, setSubmitting] = useState(false);
  const [partnershipSubmitting, setPartnershipSubmitting] = useState(false);
  const [partnershipMessage, setPartnershipMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ projectId: string; publicUrl: string; pin: string } | null>(null);

  // ============================================================
  // UPLOAD MULTIPLE (IMAGES + VIDÉOS)
  // ============================================================
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = (file: File) => file.type.startsWith("video/");
  const isImage = (file: File) => file.type.startsWith("image/");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(
      (file) =>
        isImage(file) ||
        (isVideo(file) && ["video/mp4", "video/webm", "video/quicktime"].includes(file.type))
    );

    if (validFiles.length < newFiles.length) {
      setError("Certains fichiers ne sont pas supportés (images: jpg, png, webp | vidéos: mp4, webm, mov).");
    }

    setUploadedFiles((prev) => [...prev, ...validFiles]);

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(filePreviews[index]);
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  // ============================================================
  // MÉTIERS SÉLECTIONNÉS
  // ============================================================
  const [selectedTrades, setSelectedTrades] = useState<string[]>(() => (trade ? [trade] : []));

  // ============================================================
  // RÈGLES MÉTIER (simplifié)
  // ============================================================
  const projectTypeOptions = useMemo(
    () => ["Rénovation", "Construction neuve", "Agrandissement", "Aménagement", "Dépannage"],
    []
  );

  // ============================================================
  // CHANTIERS SÉLECTIONNÉS ET LEURS DONNÉES
  // ============================================================
  const [chantiersSelectionnes, setChantiersSelectionnes] = useState<string[]>([]);
  const [piecesData, setPiecesData] = useState<Record<string, PieceData>>({});

  const chantierOptions = [
    "Totalité du bâtiment",
    "Salon",
    "Chambre",
    "Cuisine",
    "Salle de bain",
    "Terrasse",
    "Garage",
    "Sous-sol",
    "Autre",
  ];

  const equipementsOptions = ["Douche", "Baignoire", "Lavabo", "WC", "Meuble vasque", "Colonne de douche"];

  const handleChantierToggle = (chantier: string) => {
    setChantiersSelectionnes((prev) =>
      prev.includes(chantier) ? prev.filter((c) => c !== chantier) : [...prev, chantier]
    );
    if (!chantiersSelectionnes.includes(chantier)) {
      setPiecesData((prev) => ({
        ...prev,
        [chantier]: {
          type: chantier,
          solSurface: "",
          murSurface: "",
          hauteur: "",
          equipements: [],
        },
      }));
    } else {
      setPiecesData((prev) => {
        const newData = { ...prev };
        delete newData[chantier];
        return newData;
      });
    }
  };

  const handlePieceChange = (chantier: string, field: keyof PieceData, value: string | string[]) => {
    setPiecesData((prev) => ({
      ...prev,
      [chantier]: {
        ...prev[chantier],
        [field]: value,
      },
    }));
  };

  // ============================================================
  // FORMULAIRE PRINCIPAL (avec les dates)
  // ============================================================
  const [form, setForm] = useState(() => ({
    ...defaultValues,
    projectType: defaultValues.projectType || "Rénovation",
    workType: defaultValues.workType || "",
    batiment: "",
    desiredStartDate: "",
    desiredEndDate: "",
  }));

  const batimentOptions = [
    "Maison individuelle",
    "Villa",
    "Immeuble",
    "Appartement",
    "Bureau",
    "Commerce",
    "Entrepôt",
    "Garage",
    "Autre",
  ];

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTradeToggle = (tradeValue: string) => {
    setSelectedTrades((prev) =>
      prev.includes(tradeValue) ? prev.filter((t) => t !== tradeValue) : [...prev, tradeValue]
    );
  };

  // ============================================================
  // SOUMISSION
  // ============================================================
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const piecesArray = Object.values(piecesData).filter((p) => p.solSurface || p.murSurface || p.hauteur);

      const payload = {
        artisanId,
        professionalRole: resolvedTargetRole,
        professionalTrade: trade,
        selectedTrades,
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail,
        clientAddress: form.clientAddress,
        projectName: form.projectName,
        projectType: form.projectType,
        workType: form.workType || null,
        description: form.description,
        budgetEstimate: form.budgetEstimate ? Number(form.budgetEstimate) : null,
        batiment: form.batiment,
        chantiers: chantiersSelectionnes,
        pieces: piecesArray,
        desiredStartDate: form.desiredStartDate || null,
        desiredEndDate: form.desiredEndDate || null,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));

      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/public/projects", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création projet");
      setResult({ projectId: data.projectId, publicUrl: data.publicUrl, pin: data.pin });
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
        body: JSON.stringify({ targetUserId: artisanId, targetRole: resolvedTargetRole === "all" ? "artisan" : resolvedTargetRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec envoi partenariat");
      setPartnershipMessage("Votre demande de partenariat a bien été envoyée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setPartnershipSubmitting(false);
    }
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ============================================================
          CADRE 1 + 2 sur la même ligne (grille 2 colonnes)
      ============================================================ */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* CADRE 1 : Coordonnées */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">1. Coordonnées</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nom
                <FieldHelp>Ces informations permettront aux artisans de vous recontacter facilement.</FieldHelp>
              </label>
              <input
                required
                value={form.clientName}
                onChange={(e) => handleChange("clientName", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Votre nom"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Téléphone
                <FieldHelp>Numéro où les artisans peuvent vous joindre pour organiser le chantier.</FieldHelp>
              </label>
              <input
                required
                value={form.clientPhone}
                onChange={(e) => handleChange("clientPhone", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="+33 6 ..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                E-mail
                <FieldHelp>Nous vous enverrons la confirmation et le devis à cette adresse.</FieldHelp>
              </label>
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
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Adresse
                <FieldHelp>L&apos;adresse exacte du chantier, indispensable pour le déplacement.</FieldHelp>
              </label>
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

        {/* CADRE 2 : Projet */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">2. Projet</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nom du projet
                <FieldHelp>Donnez un nom court pour identifier votre chantier (ex: &quot;Rénovation SdB&quot;).</FieldHelp>
              </label>
              <input
                required
                value={form.projectName}
                onChange={(e) => handleChange("projectName", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Ex : Rénovation salle de bain"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Type de bâtiment
                <FieldHelp>Précisez le type de structure concernée par les travaux.</FieldHelp>
              </label>
              <select
                required
                value={form.batiment}
                onChange={(e) => handleChange("batiment", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="">Sélectionnez un type de bâtiment</option>
                {batimentOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Type de projet
                <FieldHelp>Précisez s&apos;il s&apos;agit d&apos;une rénovation complète, d&apos;une construction neuve, ou d&apos;un dépannage.</FieldHelp>
              </label>
              <select
                value={form.projectType}
                onChange={(e) => handleChange("projectType", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
              >
                {projectTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Budget estimé du chantier
                <FieldHelp>Indiquez un budget cible pour aider l&apos;artisan à préparer un devis cohérent et réaliste.</FieldHelp>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.budgetEstimate}
                  onChange={(e) => handleChange("budgetEstimate", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Ex : 5000"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-500">
                  €
                </span>
              </div>
            </div>

            {form.projectType === "Autre" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Précisez votre projet
                  <FieldHelp>Si votre projet ne correspond pas aux types listés, décrivez-le ici.</FieldHelp>
                </label>
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
      </div>

      {/* ============================================================
          CADRE 3 : Métiers nécessaires (inchangé)
      ============================================================ */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-900">3. Métiers nécessaires</h3>
        <p className="mb-2 text-sm text-slate-600">
          Cochez tous les corps de métier qui devront intervenir sur ce chantier.
          <FieldHelp>
            Si vous avez besoin de plusieurs artisans (plombier + carreleur + électricien, etc.), cochez toutes les cases correspondantes.
            La plateforme coordonnera le projet en conséquence.
          </FieldHelp>
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "plombier", label: "Plomberie", icon: "💧" },
            { value: "carreleur", label: "Carrelage", icon: "🧱" },
            { value: "electricien", label: "Électricité", icon: "⚡" },
            { value: "peintre", label: "Peinture", icon: "🎨" },
            { value: "menuisier", label: "Menuiserie", icon: "🪚" },
            { value: "maçon", label: "Maçonnerie", icon: "🧱" },
          ].map((tradeItem) => {
            const checked = selectedTrades.includes(tradeItem.value);
            return (
              <label
                key={tradeItem.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition ${
                  checked ? "border-blue-500 bg-blue-100" : "border-gray-200 bg-white hover:border-blue-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleTradeToggle(tradeItem.value)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-lg">{tradeItem.icon}</span>
                <span className="text-sm font-medium text-gray-700">{tradeItem.label}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">Sélectionnez au moins un métier.</p>
      </section>

      {/* ============================================================
          CADRE 4 : Type de chantier (checkbox) + Blocs dimensions
      ============================================================ */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">4. Type de chantier</h3>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {chantierOptions.map((chantier) => (
            <label
              key={chantier}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition ${
                chantiersSelectionnes.includes(chantier)
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <input
                type="checkbox"
                checked={chantiersSelectionnes.includes(chantier)}
                onChange={() => handleChantierToggle(chantier)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{chantier}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Sélectionnez au moins un type de chantier pour définir les dimensions.
        </p>

        {chantiersSelectionnes.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {chantiersSelectionnes.map((chantier) => {
              const data = piecesData[chantier] || { solSurface: "", murSurface: "", hauteur: "", equipements: [] };
              const isSdb = chantier === "Salle de bain";
              const isCuisine = chantier === "Cuisine";
              const showMur = isSdb || isCuisine;
              const showHauteur = isSdb || chantier === "Totalité du bâtiment";
              const showEquipements = isSdb;

              return (
                <div key={chantier} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <h4 className="mb-3 text-sm font-bold text-slate-800">📍 {chantier}</h4>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Sol (m²)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.solSurface}
                        onChange={(e) => handlePieceChange(chantier, "solSurface", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {showMur && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Murs (m²)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={data.murSurface}
                          onChange={(e) => handlePieceChange(chantier, "murSurface", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {showHauteur && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Hauteur (m)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={data.hauteur}
                          onChange={(e) => handlePieceChange(chantier, "hauteur", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500"
                          placeholder="2.50"
                        />
                      </div>
                    )}

                    {showEquipements && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Équipements</label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {equipementsOptions.map((equip) => (
                            <label
                              key={equip}
                              className={`flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-xs transition ${
                                data.equipements?.includes(equip)
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-200 bg-white hover:border-blue-200"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={data.equipements?.includes(equip) || false}
                                onChange={(e) => {
                                  const current = data.equipements || [];
                                  const next = e.target.checked
                                    ? [...current, equip]
                                    : current.filter((e) => e !== equip);
                                  handlePieceChange(chantier, "equipements", next);
                                }}
                                className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{equip}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================
          CADRE 5 : Calendrier souhaité
      ============================================================ */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">5. Calendrier souhaité</h3>
        <p className="mb-4 text-sm text-slate-600">
          Indiquez vos dates souhaitées pour le début et la fin des travaux.
          <FieldHelp>
            Cela permet aux artisans de savoir si vous avez des contraintes de temps, et de planifier leur intervention en conséquence.
          </FieldHelp>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Date de début souhaitée
              <FieldHelp>À partir de quand les travaux peuvent-ils commencer ?</FieldHelp>
            </label>
            <input
              type="date"
              value={form.desiredStartDate}
              onChange={(e) => handleChange("desiredStartDate", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Date de fin souhaitée
              <FieldHelp>À quelle date souhaitez-vous que les travaux soient terminés ?</FieldHelp>
            </label>
            <input
              type="date"
              value={form.desiredEndDate}
              onChange={(e) => handleChange("desiredEndDate", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
              min={form.desiredStartDate || new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          CADRE 6 : Photos du chantier
      ============================================================ */}
      <section className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
        <h3 className="mb-2 text-lg font-bold text-slate-900">📸 Photos et vidéos du chantier</h3>
        <p className="mb-4 text-sm text-slate-600">
          Uploadez des photos ou des vidéos de la pièce (sol, murs, plafond, arrivées d&apos;eau, etc.).
          <FieldHelp>
            Plus vous fournissez de fichiers, plus l&apos;artisan pourra préparer un devis précis.
            Formats acceptés : images (jpg, png, webp) et vidéos (mp4, webm, mov).
          </FieldHelp>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50">
            Choisir des fichiers
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <span className="text-sm text-slate-500">
            {uploadedFiles.length} fichier{uploadedFiles.length > 1 ? "s" : ""} sélectionné{uploadedFiles.length > 1 ? "s" : ""}
          </span>
        </div>

        {filePreviews.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filePreviews.map((url, index) => {
              const file = uploadedFiles[index];
              const isVideoFile = file && isVideo(file);
              return (
                <div key={index} className="relative rounded-lg border border-slate-200 bg-white p-1">
                  {isVideoFile ? (
                    <video src={url} className="h-24 w-full rounded object-cover" controls />
                  ) : (
                    <Image
                      src={url}
                      alt={`Fichier ${index + 1}`}
                      width={120}
                      height={120}
                      className="h-24 w-full rounded object-cover"
                      unoptimized
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================
          CADRE 7 : Description libre
      ============================================================ */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Description libre du projet
          <FieldHelp>
            Décrivez précisément vos besoins, les contraintes, ou l&apos;état actuel de la pièce.
            Plus vous êtes précis, plus le devis sera juste.
          </FieldHelp>
        </label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
          placeholder="Décrivez les contraintes, l&apos;état du support, les objectifs, les remarques ou les besoins particuliers du chantier..."
        />
      </section>

      {/* ============================================================
          ERREURS & MESSAGES
      ============================================================ */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {partnershipMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {partnershipMessage}
        </div>
      )}

      {/* ============================================================
          RÉSULTAT
      ============================================================ */}
      {result ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Projet créé</div>
          <h3 className="mt-2 text-xl font-bold">Votre demande de devis a bien été enregistrée.</h3>
          <p className="mt-2 text-sm">
            Code PIN projet : <span className="font-black tracking-[0.2em]">{result.pin}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
            <span className="font-semibold text-slate-700">Lien de votre projet :</span>
            <a
              href={result.publicUrl}
              className="break-all font-medium text-emerald-700 underline hover:text-emerald-800"
            >
              {result.publicUrl}
            </a>
          </div>
          <p className="mt-2 text-sm">
            {broadcastMode
              ? "Les professionnels correspondant à cette spécialité pourront consulter votre demande."
              : "Ce code vous permettra de retrouver votre projet à tout moment."}
          </p>
          <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-4 text-lg font-bold leading-snug text-amber-900">
            ⚠️ Notez bien ce lien et ce code PIN dès maintenant. Sans eux, vous ne pourrez plus consulter le résultat de
            votre demande de devis.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={result.publicUrl}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
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
            {submitting
              ? "Envoi..."
              : broadcastMode
                ? `Demander un devis à tous les ${professionalLabel === "professionnel" ? "professionnels" : `${professionalLabel}s`}`
                : `Confirmer le devis`}
          </button>
        </div>
      )}
    </form>
  );
}
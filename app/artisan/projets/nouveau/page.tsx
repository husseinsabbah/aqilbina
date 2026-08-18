"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, X, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Product = {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  stock: number;
};

type Service = {
  id: string;
  name: string;
  serviceCategory: string;
  unit: string;
  unitPrice: number;
  isActive: boolean;
};

type SelectedProduct = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type Wall = {
  id: string;
  longueur: number;
  hauteur: number;
};

type ProjectItem = {
  productId?: string;
  serviceId?: string;
  quantity: number;
  unitPriceHtAtSale: number;
  tvaRate: number;
  name: string;
  type: "product" | "service";
  surface?: "sol" | "mur";
};

// Types de projet
const PROJECT_TYPES = [
  "Pose de carrelage sol",
  "Pose de carrelage mur",
  "Rénovation salle de bain",
  "Rénovation cuisine",
  "Terrasse extérieure",
  "Carrelage piscine",
  "Carrelage escalier",
  "Autre",
];

// Types de chantier
const WORK_TYPES = [
  { value: "refresh", label: "🔄 Rafraîchissement (pose sur support existant)" },
  { value: "renovation", label: "🏗️ Rénovation complète (démolition + préparation)" },
];

// Produits supplémentaires suggérés selon le type de chantier
const SUGGESTED_PRODUCTS = {
  refresh: [
    "Colle à carrelage",
    "Joint de carrelage",
    "Croisillons",
    "Primaire d'accrochage",
  ],
  renovation: [
    "Colle à carrelage",
    "Joint de carrelage",
    "Croisillons",
    "Primaire d'accrochage",
    "Mortier de chape",
    "Résine d'étanchéité",
    "Réglette de nivellement",
    "Disque de coupe (carrelage)",
  ],
};

export default function NouveauProjetPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    workType: "",
    budgetEstimate: "",
  });

  // SOL
  const [solLongueur, setSolLongueur] = useState<number | "">("");
  const [solLargeur, setSolLargeur] = useState<number | "">("");
  const [surfaceSol, setSurfaceSol] = useState(0);
  const [solService, setSolService] = useState<Service | null>(null);
  const [solUnitPrice, setSolUnitPrice] = useState<number>(0);
  const [solProducts, setSolProducts] = useState<SelectedProduct[]>([]);
  const [solSearchTerm, setSolSearchTerm] = useState("");
  const [solSearchResults, setSolSearchResults] = useState<Product[]>([]);

  // MURS
  const [nbMurs, setNbMurs] = useState(0);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [surfaceMurs, setSurfaceMurs] = useState(0);
  const [murService, setMurService] = useState<Service | null>(null);
  const [murUnitPrice, setMurUnitPrice] = useState<number>(0);
  const [murProducts, setMurProducts] = useState<SelectedProduct[]>([]);
  const [murSearchTerm, setMurSearchTerm] = useState("");
  const [murSearchResults, setMurSearchResults] = useState<Product[]>([]);

  const [services, setServices] = useState<Service[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<SelectedProduct[]>([]);

  // ===== Calcul des surfaces =====
  useEffect(() => {
    if (solLongueur && solLargeur) {
      setSurfaceSol(solLongueur * solLargeur);
    } else {
      setSurfaceSol(0);
    }
  }, [solLongueur, solLargeur]);

  useEffect(() => {
    const total = walls.reduce((acc, w) => acc + w.longueur * w.hauteur, 0);
    setSurfaceMurs(total);
  }, [walls]);

  // ===== Gestion des murs =====
  useEffect(() => {
    if (nbMurs > 0) {
      setWalls(
        Array.from({ length: nbMurs }, (_, i) => ({
          id: `mur-${i + 1}`,
          longueur: 0,
          hauteur: 0,
        }))
      );
    } else {
      setWalls([]);
    }
  }, [nbMurs]);

  const updateWall = (index: number, field: "longueur" | "hauteur", value: number) => {
    const newWalls = [...walls];
    newWalls[index][field] = value;
    setWalls(newWalls);
  };

  // ===== Chargement des données =====
  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'artisan' && session.user.trade !== 'artisan') {
      router.push('/auth/signin');
      return;
    }

    const fetchData = async () => {
      try {
        const [resProducts, resServices] = await Promise.all([
          fetch("/api/seller/products", { credentials: "include" }),
          fetch("/api/services", { credentials: "include" }),
        ]);

        if (resProducts.ok) {
          const data = await resProducts.json();
          setAllProducts(data);
        }

        if (resServices.ok) {
          const data = await resServices.json();
          const activeServices = data.filter((s: Service) => s.isActive);
          setServices(activeServices);
        }
      } catch (error) {
        console.error("Erreur chargement:", error);
      }
    };
    fetchData();
  }, [session, router]);

  // ===== Mise à jour des services sol/mur en fonction du workType =====
  useEffect(() => {
    if (!formData.workType || services.length === 0) {
      setSolService(null);
      setMurService(null);
      setSolUnitPrice(0);
      setMurUnitPrice(0);
      return;
    }

    const workLabel = formData.workType === "refresh" ? "Rafraîchissement" : "Rénovation";

    // Chercher les services correspondants
    const sol = services.find(
      (s) =>
        (s.serviceCategory === `Sol - ${workLabel}` ||
          s.serviceCategory === "Sol" ||
          s.serviceCategory === "Pose") &&
        s.name.toLowerCase().includes(workLabel.toLowerCase())
    );
    if (sol) {
      setSolService(sol);
      setSolUnitPrice(sol.unitPrice);
    } else {
      // Fallback : prendre le premier service "Sol" si pas de catégorie spécifique
      const fallbackSol = services.find(
        (s) => s.serviceCategory === "Sol" || s.serviceCategory === "Pose"
      );
      if (fallbackSol) {
        setSolService(fallbackSol);
        setSolUnitPrice(fallbackSol.unitPrice);
      } else {
        setSolService(null);
        setSolUnitPrice(0);
      }
    }

    const mur = services.find(
      (s) =>
        (s.serviceCategory === `Mur - ${workLabel}` ||
          s.serviceCategory === "Mur" ||
          s.serviceCategory === "Pose") &&
        s.name.toLowerCase().includes(workLabel.toLowerCase())
    );
    if (mur) {
      setMurService(mur);
      setMurUnitPrice(mur.unitPrice);
    } else {
      const fallbackMur = services.find(
        (s) => s.serviceCategory === "Mur" || s.serviceCategory === "Pose"
      );
      if (fallbackMur) {
        setMurService(fallbackMur);
        setMurUnitPrice(fallbackMur.unitPrice);
      } else {
        setMurService(null);
        setMurUnitPrice(0);
      }
    }
  }, [formData.workType, services]);

  // ===== Produits suggérés =====
  useEffect(() => {
    if (!formData.workType || allProducts.length === 0) {
      setSuggestedProducts([]);
      return;
    }

    const suggestions = SUGGESTED_PRODUCTS[formData.workType as keyof typeof SUGGESTED_PRODUCTS] || [];
    const foundProducts: SelectedProduct[] = [];

    suggestions.forEach((name) => {
      const product = allProducts.find(
        (p) => p.name.toLowerCase().includes(name.toLowerCase())
      );
      if (product) {
        foundProducts.push({
          id: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.salePrice,
        });
      }
    });

    setSuggestedProducts(foundProducts);
  }, [formData.workType, allProducts]);

  // ===== Recherche de produits (sol) =====
  useEffect(() => {
    if (solSearchTerm.trim() === "") {
      setSolSearchResults([]);
      return;
    }
    const filtered = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(solSearchTerm.toLowerCase()) &&
        !solProducts.some((sp) => sp.id === p.id)
    );
    setSolSearchResults(filtered);
  }, [solSearchTerm, allProducts, solProducts]);

  // ===== Recherche de produits (mur) =====
  useEffect(() => {
    if (murSearchTerm.trim() === "") {
      setMurSearchResults([]);
      return;
    }
    const filtered = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(murSearchTerm.toLowerCase()) &&
        !murProducts.some((sp) => sp.id === p.id)
    );
    setMurSearchResults(filtered);
  }, [murSearchTerm, allProducts, murProducts]);

  // ===== Gestion des produits (sol) =====
  const addSolProduct = (product: Product) => {
    setSolProducts([
      ...solProducts,
      {
        id: product.id,
        name: product.name,
        quantity: surfaceSol > 0 ? surfaceSol : 1,
        unitPrice: product.salePrice,
      },
    ]);
    setSolSearchTerm("");
    setSolSearchResults([]);
  };

  const removeSolProduct = (id: string) => {
    setSolProducts(solProducts.filter((p) => p.id !== id));
  };

  const updateSolProductQuantity = (id: string, quantity: number) => {
    setSolProducts(
      solProducts.map((p) =>
        p.id === id ? { ...p, quantity: Math.max(0, quantity) } : p
      )
    );
  };

  const updateSolProductUnitPrice = (id: string, unitPrice: number) => {
    setSolProducts(
      solProducts.map((p) =>
        p.id === id ? { ...p, unitPrice: Math.max(0, unitPrice) } : p
      )
    );
  };

  // ===== Gestion des produits (mur) =====
  const addMurProduct = (product: Product) => {
    setMurProducts([
      ...murProducts,
      {
        id: product.id,
        name: product.name,
        quantity: surfaceMurs > 0 ? surfaceMurs : 1,
        unitPrice: product.salePrice,
      },
    ]);
    setMurSearchTerm("");
    setMurSearchResults([]);
  };

  const removeMurProduct = (id: string) => {
    setMurProducts(murProducts.filter((p) => p.id !== id));
  };

  const updateMurProductQuantity = (id: string, quantity: number) => {
    setMurProducts(
      murProducts.map((p) =>
        p.id === id ? { ...p, quantity: Math.max(0, quantity) } : p
      )
    );
  };

  const updateMurProductUnitPrice = (id: string, unitPrice: number) => {
    setMurProducts(
      murProducts.map((p) =>
        p.id === id ? { ...p, unitPrice: Math.max(0, unitPrice) } : p
      )
    );
  };

  // ===== Gestion des produits suggérés =====
  const removeSuggestedProduct = (id: string) => {
    setSuggestedProducts(suggestedProducts.filter((p) => p.id !== id));
  };

  const updateSuggestedProductQuantity = (id: string, quantity: number) => {
    setSuggestedProducts(
      suggestedProducts.map((p) =>
        p.id === id ? { ...p, quantity: Math.max(0, quantity) } : p
      )
    );
  };

  // ===== Construction des items du projet =====
  const buildItems = (): ProjectItem[] => {
    const items: ProjectItem[] = [];

    // Produits du sol
    solProducts.forEach((p) => {
      items.push({
        productId: p.id,
        quantity: p.quantity,
        unitPriceHtAtSale: p.unitPrice / 1.2,
        tvaRate: 20,
        name: p.name,
        type: "product",
        surface: "sol",
      });
    });

    // Produits des murs
    murProducts.forEach((p) => {
      items.push({
        productId: p.id,
        quantity: p.quantity,
        unitPriceHtAtSale: p.unitPrice / 1.2,
        tvaRate: 20,
        name: p.name,
        type: "product",
        surface: "mur",
      });
    });

    // Produits suggérés
    suggestedProducts.forEach((p) => {
      items.push({
        productId: p.id,
        quantity: p.quantity,
        unitPriceHtAtSale: p.unitPrice / 1.2,
        tvaRate: 20,
        name: p.name,
        type: "product",
      });
    });

    // Service Sol
    if (surfaceSol > 0 && solService) {
      items.push({
        serviceId: solService.id,
        quantity: surfaceSol,
        unitPriceHtAtSale: solUnitPrice / 1.2,
        tvaRate: 20,
        name: `${solService.name} (sol)`,
        type: "service",
      });
    }

    // Service Mur
    if (surfaceMurs > 0 && murService) {
      items.push({
        serviceId: murService.id,
        quantity: surfaceMurs,
        unitPriceHtAtSale: murUnitPrice / 1.2,
        tvaRate: 20,
        name: `${murService.name} (murs)`,
        type: "service",
      });
    }

    return items;
  };

  // ===== SOUMISSION =====
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Veuillez donner un nom au projet.");
      return;
    }

    const items = buildItems();
    if (items.length === 0) {
      alert("Veuillez ajouter au moins un produit ou une prestation (sol ou murs).");
      return;
    }

    setSubmitting(true);
    try {
      const apiItems = items.map((item) => ({
        productId: item.productId,
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitPriceHtAtSale: item.unitPriceHtAtSale,
        tvaRate: item.tvaRate,
      }));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          type: formData.type || null,
          workType: formData.workType || null,
          surface: surfaceSol + surfaceMurs,
          budgetEstimate: formData.budgetEstimate ? parseFloat(formData.budgetEstimate) : null,
          items: apiItems,
          solDetails: {
            longueur: solLongueur || 0,
            largeur: solLargeur || 0,
            surface: surfaceSol,
          },
          murDetails: {
            nbMurs,
            walls: walls.map((w) => ({ longueur: w.longueur, hauteur: w.hauteur })),
            surface: surfaceMurs,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      const data = await res.json();
      alert(`✅ Projet "${formData.name}" créé avec succès !`);
      router.push("/artisan");
    } catch (error) {
      console.error("Erreur création projet:", error);
      alert("Erreur lors de la création du projet : " + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const projectItems = buildItems();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">📋 Nouveau projet</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de projet</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un type...</option>
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de chantier *</label>
                <select
                  value={formData.workType}
                  onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {WORK_TYPES.map((wt) => (
                    <option key={wt.value} value={wt.value}>{wt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget estimé (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ex: 5000"
                  value={formData.budgetEstimate}
                  onChange={(e) => setFormData({ ...formData, budgetEstimate: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* SECTION SOL */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">🟦 Sol</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longueur (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={solLongueur}
                    onChange={(e) => setSolLongueur(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largeur (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={solLargeur}
                    onChange={(e) => setSolLargeur(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surface (m²)</label>
                  <input
                    type="text"
                    value={surfaceSol ? surfaceSol.toFixed(2) : "0.00"}
                    readOnly
                    className="w-full px-4 py-2 border bg-gray-100 rounded-lg text-gray-700"
                  />
                </div>
              </div>

              {/* Affichage de la prestation sol (sélectionnée selon workType) */}
              {surfaceSol > 0 && solService && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-medium text-sm">✅ Prestation sol :</span>
                    <span className="text-sm">{solService.name}</span>
                    <span className="text-sm text-gray-500">{surfaceSol.toFixed(2)} m²</span>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Prix / m² :</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={solUnitPrice}
                        onChange={(e) => setSolUnitPrice(parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-sm text-gray-500">€</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      Total : {(surfaceSol * solUnitPrice).toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}
              {surfaceSol > 0 && !solService && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Aucune prestation trouvée pour le sol avec ce type de chantier. Vérifiez vos paramètres.
                </p>
              )}

              {/* Produits pour le sol */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Produits pour le sol</label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher un produit pour le sol..."
                      value={solSearchTerm}
                      onChange={(e) => setSolSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {solSearchResults.length > 0 && (
                  <ul className="border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                    {solSearchResults.map((p) => (
                      <li
                        key={p.id}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                        onClick={() => addSolProduct(p)}
                      >
                        <span>{p.name}</span>
                        <span className="text-sm text-gray-500">{p.salePrice} €</span>
                      </li>
                    ))}
                  </ul>
                )}
                {solProducts.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Produit</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Quantité</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solProducts.map((p) => (
                          <tr key={p.id} className="border-b border-gray-100">
                            <td className="px-4 py-1 text-sm">{p.name}</td>
                            <td className="px-4 py-1">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={p.quantity}
                                onChange={(e) => updateSolProductQuantity(p.id, parseFloat(e.target.value) || 0)}
                                className="w-16 px-1 py-0.5 border rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={p.unitPrice}
                                onChange={(e) => updateSolProductUnitPrice(p.id, parseFloat(e.target.value) || 0)}
                                className="w-24 px-1 py-0.5 border rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-1 text-sm font-medium">
                              {(p.quantity * p.unitPrice).toFixed(2)} €
                            </td>
                            <td className="px-4 py-1">
                              <button
                                type="button"
                                onClick={() => removeSolProduct(p.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION MURS */}
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">🧱 Murs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de murs</label>
                  <select
                    value={nbMurs}
                    onChange={(e) => setNbMurs(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surface totale des murs (m²)</label>
                  <input
                    type="text"
                    value={surfaceMurs ? surfaceMurs.toFixed(2) : "0.00"}
                    readOnly
                    className="w-full px-4 py-2 border bg-gray-100 rounded-lg text-gray-700"
                  />
                </div>
              </div>

              {walls.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Mur</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Longueur (m)</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Hauteur (m)</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Surface (m²)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walls.map((wall, index) => {
                        const surface = wall.longueur * wall.hauteur;
                        return (
                          <tr key={wall.id} className="border-b border-gray-100">
                            <td className="px-4 py-2 text-sm font-medium">Mur {index + 1}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={wall.longueur || ""}
                                onChange={(e) => updateWall(index, "longueur", parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={wall.hauteur || ""}
                                onChange={(e) => updateWall(index, "hauteur", parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm">{surface ? surface.toFixed(2) : "0.00"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Affichage de la prestation mur (sélectionnée selon workType) */}
              {surfaceMurs > 0 && murService && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-medium text-sm">✅ Prestation murs :</span>
                    <span className="text-sm">{murService.name}</span>
                    <span className="text-sm text-gray-500">{surfaceMurs.toFixed(2)} m²</span>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Prix / m² :</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={murUnitPrice}
                        onChange={(e) => setMurUnitPrice(parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-sm text-gray-500">€</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      Total : {(surfaceMurs * murUnitPrice).toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}
              {surfaceMurs > 0 && !murService && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Aucune prestation trouvée pour les murs avec ce type de chantier. Vérifiez vos paramètres.
                </p>
              )}

              {/* Produits pour les murs */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Produits pour les murs</label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher un produit pour les murs..."
                      value={murSearchTerm}
                      onChange={(e) => setMurSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {murSearchResults.length > 0 && (
                  <ul className="border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                    {murSearchResults.map((p) => (
                      <li
                        key={p.id}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                        onClick={() => addMurProduct(p)}
                      >
                        <span>{p.name}</span>
                        <span className="text-sm text-gray-500">{p.salePrice} €</span>
                      </li>
                    ))}
                  </ul>
                )}
                {murProducts.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Produit</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Quantité</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {murProducts.map((p) => (
                          <tr key={p.id} className="border-b border-gray-100">
                            <td className="px-4 py-1 text-sm">{p.name}</td>
                            <td className="px-4 py-1">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={p.quantity}
                                onChange={(e) => updateMurProductQuantity(p.id, parseFloat(e.target.value) || 0)}
                                className="w-16 px-1 py-0.5 border rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={p.unitPrice}
                                onChange={(e) => updateMurProductUnitPrice(p.id, parseFloat(e.target.value) || 0)}
                                className="w-24 px-1 py-0.5 border rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-1 text-sm font-medium">
                              {(p.quantity * p.unitPrice).toFixed(2)} €
                            </td>
                            <td className="px-4 py-1">
                              <button
                                type="button"
                                onClick={() => removeMurProduct(p.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* PRODUITS SUGGÉRÉS */}
            {suggestedProducts.length > 0 && (
              <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  💡 Produits suggérés pour {formData.workType === "refresh" ? "un rafraîchissement" : "une rénovation"}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Ces produits sont généralement nécessaires pour ce type de chantier. Vous pouvez les ajuster ou les supprimer.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Produit</th>
                        <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Quantité</th>
                        <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                        <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestedProducts.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="px-4 py-1 text-sm">{p.name}</td>
                          <td className="px-4 py-1">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={p.quantity}
                              onChange={(e) => updateSuggestedProductQuantity(p.id, parseFloat(e.target.value) || 0)}
                              className="w-16 px-1 py-0.5 border rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-1">{p.unitPrice} €</td>
                          <td className="px-4 py-1 text-sm font-medium">
                            {(p.quantity * p.unitPrice).toFixed(2)} €
                          </td>
                          <td className="px-4 py-1">
                            <button
                              type="button"
                              onClick={() => removeSuggestedProduct(p.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PRÉVISUALISATION DES ITEMS DU PROJET */}
            {projectItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Surface</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Quantité</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Prix HT</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectItems.map((item, index) => {
                      const totalHT = item.quantity * item.unitPriceHtAtSale;
                      return (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="px-4 py-2 text-sm">
                            {item.type === "product" ? "📦 Produit" : "🔧 Prestation"}
                          </td>
                          <td className="px-4 py-2 text-sm">{item.name}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.surface === "sol" ? "Sol" : item.surface === "mur" ? "Mur" : "-"}
                          </td>
                          <td className="px-4 py-2 text-sm">{item.quantity.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm">{item.unitPriceHtAtSale.toFixed(2)} €</td>
                          <td className="px-4 py-2 text-sm font-medium">{totalHT.toFixed(2)} €</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right font-semibold">Total HT</td>
                      <td className="px-4 py-2 font-semibold">
                        {projectItems.reduce((acc, i) => acc + i.quantity * i.unitPriceHtAtSale, 0).toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push("/artisan")}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer le projet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
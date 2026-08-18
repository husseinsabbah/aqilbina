"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Package, Eye, Send, Store, Plus, Edit, Trash2,
  Search, Loader2, Upload, Sparkles, Zap, CheckCircle,
  XCircle, Calendar, Clock, TrendingUp, ArrowRight,
  AlertCircle, LayoutDashboard, Download
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ===== TYPES =====
type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  brand: string | null;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  reservedStock: number;
  tvaRate: number;
  imageUrl: string | null;
  catalogId: string;
  createdAt: string;
};

type Catalog = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

type Proposal = {
  id: string;
  projectId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  status: string;
  message: string | null;
  marketingMessage: string | null;
  deliveryDate: string | null;
  expirationDate: string | null;
  createdAt: string;
  product: { name: string; brand: string | null };
  project?: { name: string };
};

type Listing = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  description: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  product: { name: string; brand: string | null; category: string; salePrice: number };
};

type AvailableProject = {
  id: string;
  name: string;
  type: string | null;
  surface: number | null;
  clientName: string;
  description: string | null;
  needs: { id: string; name: string; quantity: number }[];
  availabilityDetails: {
    name: string;
    quantity: number;
    available: boolean;
    stock: number;
    productId: string | null;
  }[];
  color: "green" | "orange" | "red";
  createdAt: string;
};

type SectionType = "dashboard" | "catalogue" | "projets" | "offres" | "annonces" | "ia";

export default function VendeurPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ===== ÉTATS =====
  const [products, setProducts] = useState<Product[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<SectionType>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get("section") as SectionType | null;
    const catalogParam = params.get("catalog");

    if (sectionParam && ["dashboard", "catalogue", "projets", "offres", "annonces", "ia"].includes(sectionParam)) {
      setSection(sectionParam);
    }

    if (catalogParam) {
      setSelectedCatalogId(catalogParam);
      setSection("catalogue");
    }
  }, []);
  
  // Catalogues & filtre
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  // Vérification agent actif
  const [hasActiveAgent, setHasActiveAgent] = useState<boolean | null>(null);
  const [checkingAgent, setCheckingAgent] = useState(true);

  // États modale produit
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    purchasePrice: "",
    salePrice: "",
    stock: "",
    tvaRate: "20",
    imageUrl: "",
    catalogId: "",
  });

  // États offres
  const [offerProjectId, setOfferProjectId] = useState("");
  const [offerProductId, setOfferProductId] = useState("");
  const [offerQuantity, setOfferQuantity] = useState("1");
  const [offerUnitPrice, setOfferUnitPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerMarketingMessage, setOfferMarketingMessage] = useState("");
  const [offerDeliveryDate, setOfferDeliveryDate] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);

  // États annonces
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingProductId, setListingProductId] = useState("");
  const [listingQuantity, setListingQuantity] = useState("");
  const [listingUnitPrice, setListingUnitPrice] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingEndDate, setListingEndDate] = useState("");
  const [sendingListing, setSendingListing] = useState(false);

  const listingTotalPrice = (() => {
    const quantity = Number(listingQuantity);
    const unitPrice = Number(listingUnitPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0 || unitPrice < 0) {
      return 0;
    }

    return quantity * unitPrice;
  })();

  // IA
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    projectId: string;
    projectName: string;
    summary: string;
    recommendedProducts: Array<Record<string, unknown>>;
    recommendedTutorials: Array<Record<string, unknown>>;
    questions: string[];
    nextAction: string;
  }>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importCatalogId, setImportCatalogId] = useState("");
  const [importNewCatalogName, setImportNewCatalogName] = useState("");

  // Suppression globale d'un catalogue
  const [showClearCatalogModal, setShowClearCatalogModal] = useState(false);

  // Relance
  const [showRelaunchModal, setShowRelaunchModal] = useState(false);
  const [relaunchData, setRelaunchData] = useState<{
    id: string;
    quantity: string;
    unitPrice: string;
    message: string;
    marketingMessage: string;
    deliveryDate: string;
  } | null>(null);

  // ===== STATISTIQUES =====
  const stats = [
    {
      label: "Produits",
      value: products.length,
      icon: Package,
      color: "blue",
      section: "catalogue" as SectionType
    },
    {
      label: "Projets dispo.",
      value: availableProjects.length,
      icon: Eye,
      color: "green",
      section: "projets" as SectionType
    },
    {
      label: "Offres envoyées",
      value: proposals.length,
      icon: Send,
      color: "purple",
      section: "offres" as SectionType
    },
    {
      label: "Annonces actives",
      value: listings.filter(l => l.isActive).length,
      icon: Store,
      color: "orange",
      section: "annonces" as SectionType
    },
  ];

  const pendingProposals = proposals.filter(p => p.status === "EN_ATTENTE").length;
  const lowStockProducts = products.filter(p => p.stock < 5);
  const recentProjects = [...availableProjects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // ===== CHARGEMENT =====
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/seller/products", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement produits");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erreur fetchProducts :", error);
    }
  };

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/seller/proposals", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (error) {
      console.error("Erreur chargement offres :", error);
    }
  };

  const fetchListings = async () => {
    try {
      const res = await fetch("/api/seller/listings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setListings(data);
      }
    } catch (error) {
      console.error("Erreur chargement annonces :", error);
    }
  };

  const fetchAvailableProjects = async () => {
    try {
      const res = await fetch("/api/vendor/projects", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAvailableProjects(data);
      }
    } catch (error) {
      console.error("Erreur chargement projets :", error);
    }
  };

  const fetchCatalogs = async () => {
    setCatalogsLoading(true);
    try {
      const res = await fetch("/api/seller/catalogs", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCatalogs(data);

        const preferredCatalog =
          data.find((cat: Catalog) => cat.name === "Catalogue Carrelage") ||
          (data.length === 1 ? data[0] : null);

        if (preferredCatalog && !selectedCatalogId) {
          setSelectedCatalogId(preferredCatalog.id);
        }
      }
    } catch (error) {
      console.error("Erreur chargement catalogues :", error);
    } finally {
      setCatalogsLoading(false);
    }
  };

  const refreshCatalogSidebar = () => {
    window.dispatchEvent(new CustomEvent("seller-catalogs:refresh"));
  };

  const fetchAISuggestions = async () => {
    setAiLoading(true);
    try {
      const projectPool = availableProjects.slice(0, 4);
      if (projectPool.length === 0) {
        setAiSuggestions([]);
        return;
      }

      const analyses = await Promise.all(
        projectPool.map(async (project) => {
          const res = await fetch('/api/agent/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ projectId: project.id }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();
          return {
            projectId: project.id,
            projectName: project.name,
            summary: typeof data.summary === 'string' ? data.summary : 'Analyse du projet en cours.',
            recommendedProducts: Array.isArray(data.recommendedProducts) ? data.recommendedProducts : [],
            recommendedTutorials: Array.isArray(data.recommendedTutorials) ? data.recommendedTutorials : [],
            questions: Array.isArray(data.questions) ? data.questions : [],
            nextAction: typeof data.nextAction === 'string' ? data.nextAction : 'Suivre la recommandation IA.',
          };
        })
      );

      setAiSuggestions(analyses.filter(Boolean) as Array<{
        projectId: string;
        projectName: string;
        summary: string;
        recommendedProducts: Array<Record<string, unknown>>;
        recommendedTutorials: Array<Record<string, unknown>>;
        questions: string[];
        nextAction: string;
      }>);
    } catch (error) {
      console.error('AI suggestions error:', error);
      setAiSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const checkActiveAgent = async () => {
    if (!session?.user?.id) {
      setHasActiveAgent(false);
      setCheckingAgent(false);
      return;
    }
    try {
      const res = await fetch("/api/user/agents/check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHasActiveAgent(Boolean(data?.hasActive));
      } else {
        setHasActiveAgent(false);
      }
    } catch (error) {
      setHasActiveAgent(false);
    } finally {
      setCheckingAgent(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchProposals(),
        fetchListings(),
        fetchAvailableProjects(),
        fetchCatalogs(),
        checkActiveAgent(),
      ]);
      setLoading(false);
    };

    load();
  }, [session]);

  const normalizeCatalogId = (catalogId: string | null | undefined) => {
    if (typeof catalogId !== "string") return null;
    const value = catalogId.trim();
    return value ? value : null;
  };

  const handleCatalogSelect = (catalogId: string | null) => {
    const safeCatalogId = normalizeCatalogId(catalogId);
    setSelectedCatalogId(safeCatalogId);
    const params = new URLSearchParams(window.location.search);
    params.set("section", "catalogue");

    if (safeCatalogId) {
      params.set("catalog", safeCatalogId);
      setSection("catalogue");
    } else {
      params.delete("catalog");
    }

    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  // ===== CRUD PRODUITS =====
  const uploadProductImage = async (file: File) => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erreur lors de l'upload de l'image");
    }

    return data.url as string | undefined;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setUploadedImageUrl(null);
      return;
    }

    try {
      setUploadingImage(true);
      const url = await uploadProductImage(file);
      if (url) {
        setUploadedImageUrl(url);
      }
    } catch (error) {
      console.error("Erreur upload image produit:", error);
      alert(error instanceof Error ? error.message : "Impossible d'importer cette image.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct
        ? `/api/seller/products/${editingProduct.id}`
        : "/api/seller/products";
      const method = editingProduct ? "PUT" : "POST";
      const resolvedImageUrl = uploadedImageUrl || formData.imageUrl.trim() || null;
      const payload = {
        ...formData,
        imageUrl: resolvedImageUrl,
        purchasePrice: parseFloat(formData.purchasePrice),
        salePrice: parseFloat(formData.salePrice),
        stock: parseInt(formData.stock),
        tvaRate: parseFloat(formData.tvaRate),
        catalogId: formData.catalogId || undefined,
        brand: formData.brand || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        await fetchProducts();
        await fetchCatalogs();
        refreshCatalogSidebar();
        setEditingProduct(null);
        setUploadedImageUrl(null);
        setFormData({
          name: "",
          description: "",
          category: "",
          brand: "",
          purchasePrice: "",
          salePrice: "",
          stock: "",
          tvaRate: "20",
          imageUrl: "",
          catalogId: "",
        });
      } else {
        console.error("Erreur lors de l'enregistrement du produit");
      }
    } catch (error) {
      console.error("Erreur handleSubmit :", error);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
    try {
      const res = await fetch(`/api/seller/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await fetchProducts();
      } else {
        console.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur deleteProduct :", error);
    }
  };

  const clearCatalogProducts = async () => {
    if (!selectedCatalogId) return;

    const productsToDelete = products.filter(p => p.catalogId === selectedCatalogId);
    if (productsToDelete.length === 0) {
      setShowClearCatalogModal(false);
      return;
    }

    try {
      const deletions = productsToDelete.map(async (product) => 
        fetch(`/api/seller/products/${product.id}`, {
          method: "DELETE",
          credentials: "include",
        })
      );

      const results = await Promise.all(deletions);
      const hasError = results.some(res => !res.ok);

      if (hasError) {
        alert("Une erreur est survenue lors de la suppression de certains produits.");
      }

      setShowClearCatalogModal(false);
      await fetchProducts();
    } catch (error) {
      console.error("Erreur clearCatalogProducts :", error);
      alert("Impossible de vider ce catalogue pour le moment.");
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setUploadedImageUrl(null);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category,
      brand: product.brand || "",
      purchasePrice: product.purchasePrice?.toString() ?? "",
      salePrice: product.salePrice?.toString() ?? "",
      stock: product.stock?.toString() ?? "",
      tvaRate: product.tvaRate?.toString() ?? "",
      imageUrl: product.imageUrl || "",
      catalogId: product.catalogId || "",
    });
    setShowModal(true);
  };

  // ===== IMPORT CSV =====
  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const resolvedCatalogId = importCatalogId || selectedCatalogId || "";
    let targetCatalogId = resolvedCatalogId;

    if (importCatalogId === "new" && importNewCatalogName.trim()) {
      try {
        const res = await fetch("/api/seller/catalogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: importNewCatalogName.trim() }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert("Erreur lors de la création du catalogue : " + err.error);
          return;
        }
        const newCatalog = await res.json();
        targetCatalogId = newCatalog.id;
        setSelectedCatalogId(newCatalog.id);
        setImportCatalogId(newCatalog.id);
        await fetchCatalogs();
      } catch (error) {
        console.error("Erreur création catalogue:", error);
        alert("Erreur lors de la création du catalogue");
        return;
      }
    }

    if (!targetCatalogId) {
      alert("Veuillez sélectionner un catalogue ou en créer un nouveau.");
      return;
    }

    setImportLoading(true);
    const formDataFile = new FormData();
    formDataFile.append("file", importFile);
    formDataFile.append("catalogId", targetCatalogId);
    try {
      const res = await fetch("/api/seller/products/import", {
        method: "POST",
        credentials: "include",
        body: formDataFile,
      });
      if (res.ok) {
        const nextCatalogId = normalizeCatalogId(targetCatalogId) || normalizeCatalogId(selectedCatalogId) || null;
        if (nextCatalogId) {
          setSelectedCatalogId(nextCatalogId);
          const params = new URLSearchParams(window.location.search);
          params.set("section", "catalogue");
          params.set("catalog", nextCatalogId);
          window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
        }
        setShowImportModal(false);
        setImportFile(null);
        setImportCatalogId("");
        setImportNewCatalogName("");
        await fetchProducts();
        await fetchCatalogs();
        refreshCatalogSidebar();
        alert("Import réussi !");
      } else {
        const err = await res.json();
        alert("Erreur import : " + (err.error || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Erreur handleImport :", error);
      alert("Erreur lors de l'import");
    } finally {
      setImportLoading(false);
    }
  };

  // ===== ENVOI D'OFFRE =====
  const handleSendOffer = async (e: FormEvent) => {
    e.preventDefault();
    if (!offerProjectId || !offerProductId) return;
    setSendingOffer(true);
    try {
      const payload = {
        projectId: offerProjectId,
        productId: offerProductId,
        quantity: parseInt(offerQuantity),
        unitPrice: parseFloat(offerUnitPrice),
        message: offerMessage,
        marketingMessage: offerMarketingMessage,
        deliveryDate: offerDeliveryDate || undefined,
      };
      const res = await fetch("/api/seller/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setOfferProjectId("");
        setOfferProductId("");
        setOfferQuantity("1");
        setOfferUnitPrice("");
        setOfferMessage("");
        setOfferMarketingMessage("");
        setOfferDeliveryDate("");
        await fetchProposals();
        await fetchProducts();
      } else {
        console.error("Erreur envoi offre");
      }
    } catch (error) {
      console.error("Erreur handleSendOffer :", error);
    } finally {
      setSendingOffer(false);
    }
  };

  // ===== RELANCE =====
  const openRelaunchModal = (proposal: Proposal) => {
    setRelaunchData({
      id: proposal.id,
      quantity: proposal.quantity.toString(),
      unitPrice: proposal.unitPrice.toString(),
      message: proposal.message || "",
      marketingMessage: proposal.marketingMessage || "",
      deliveryDate: proposal.deliveryDate || "",
    });
    setShowRelaunchModal(true);
  };

  const handleRelaunch = async (e: FormEvent) => {
    e.preventDefault();
    if (!relaunchData) return;
    try {
      const res = await fetch(`/api/seller/proposals/${relaunchData.id}/relaunch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          quantity: parseInt(relaunchData.quantity),
          unitPrice: parseFloat(relaunchData.unitPrice),
          message: relaunchData.message,
          marketingMessage: relaunchData.marketingMessage,
          deliveryDate: relaunchData.deliveryDate || undefined,
        }),
      });
      if (res.ok) {
        setShowRelaunchModal(false);
        setRelaunchData(null);
        await fetchProposals();
      }
    } catch (error) {
      console.error("Erreur handleRelaunch :", error);
    }
  };

  const cancelProposal = async (id: string) => {
    if (!confirm("Annuler cette offre ?")) return;
    try {
      const res = await fetch(`/api/seller/proposals/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await fetchProposals();
        await fetchProducts();
      }
    } catch (error) {
      console.error("Erreur cancelProposal :", error);
    }
  };

  // ===== CRÉATION D'ANNONCE =====
  const handleCreateListing = async (e: FormEvent) => {
    e.preventDefault();
    if (!listingProductId || !listingQuantity || !listingUnitPrice || !listingEndDate) return;
    setSendingListing(true);
    try {
      const payload = {
        productId: listingProductId,
        quantity: parseInt(listingQuantity),
        unitPrice: parseFloat(listingUnitPrice),
        description: listingDescription,
        endDate: listingEndDate,
      };
      const res = await fetch("/api/seller/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowListingModal(false);
        setListingProductId("");
        setListingQuantity("");
        setListingUnitPrice("");
        setListingDescription("");
        setListingEndDate("");
        await fetchListings();
      }
    } catch (error) {
      console.error("Erreur handleCreateListing :", error);
    } finally {
      setSendingListing(false);
    }
  };

  // ===== RENDU DES SECTIONS =====
  const renderSection = () => {
    const safeSelectedCatalogId = normalizeCatalogId(selectedCatalogId);
    const activeCatalog = catalogs.find(c => c.id === safeSelectedCatalogId) ?? null;
    const activeCatalogId = safeSelectedCatalogId ?? (catalogs.length === 1 ? catalogs[0].id : null);

    const filteredProducts = activeCatalogId
      ? products.filter(p => p.catalogId === activeCatalogId)
      : products;

    const getCatalogsWithProducts = () => {
      if (activeCatalogId) {
        const catalog = catalogs.find(c => c.id === activeCatalogId) ?? activeCatalog;
        if (!catalog) return [];
        const prods = products.filter(p => p.catalogId === activeCatalogId);
        return [{ catalog, products: prods }];
      }
      return catalogs
        .map(cat => ({
          catalog: cat,
          products: products.filter(p => p.catalogId === cat.id),
        }))
        .filter(group => group.products.length > 0);
    };

    const catalogGroups = getCatalogsWithProducts();

    switch (section) {
      case "dashboard":
        return (
          <div>
            {lowStockProducts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">
                  ⚠️ {lowStockProducts.length} produit(s) en stock critique (&lt; 5 unités) :
                  {lowStockProducts.slice(0, 3).map(p => (
                    <span key={p.id} className="font-medium ml-1">{p.name}</span>
                  ))}
                  {lowStockProducts.length > 3 && <span className="ml-1">et {lowStockProducts.length - 3} autres</span>}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  onClick={() => setSection(stat.section)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition"
                >
                  <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  Offres en attente
                </h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">{pendingProposals}</p>
                <button
                  onClick={() => setSection("offres")}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Voir les offres en attente →
                </button>
              </div>
              <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Projets récents
                </h3>
                {recentProjects.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-1">Aucun projet récent</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {recentProjects.map(p => (
                      <li key={p.id} className="text-sm text-gray-600 flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => setSection("projets")}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Voir tous →
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> 
                  {selectedCatalogId 
                    ? `Produits en vedette - ${catalogs.find(c => c.id === selectedCatalogId)?.name || "Catalogue"}`
                    : "Produits en vedette"}
                </h3>
                <button
                  onClick={() => {
                    if (selectedCatalogId) {
                      setSelectedCatalogId(null);
                    } else {
                      setSection("catalogue");
                    }
                  }}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {selectedCatalogId ? "Voir tous les catalogues" : "Voir tout le catalogue"} 
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {catalogGroups.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun produit dans ce catalogue.</p>
              ) : selectedCatalogId ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {filteredProducts
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 8)
                    .map(p => (
                      <div key={p.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-16 object-cover rounded-md mb-2" />
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm font-medium truncate">{p.name}</span>
                          <span className="text-xs text-gray-500">{p.category}</span>
                        </div>
                        {p.brand && <div className="text-xs text-gray-400">Marque: {p.brand}</div>}
                        <div className="mt-1 text-sm font-bold text-blue-600">{p.salePrice} €</div>
                        <div className="text-xs text-gray-500">Stock: {p.stock}</div>
                      </div>
                    ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-sm text-gray-400 col-span-4">Aucun produit dans ce catalogue.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {catalogGroups.map((group, index) => {
                    const isLast = index === catalogGroups.length - 1;
                    const isOddLast = isLast && catalogGroups.length % 2 === 1;
                    const productsToShow = group.products
                      .sort(() => Math.random() - 0.5)
                      .slice(0, isOddLast ? 8 : 4);

                    return (
                      <div key={group.catalog.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            {group.catalog.name}
                            <span className="ml-2 text-xs text-gray-400">({group.products.length} produits)</span>
                          </h4>
                          <button
                            onClick={() => {
                              setSelectedCatalogId(group.catalog.id);
                              setSection("catalogue");
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Voir tout →
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {productsToShow.map(p => (
                            <div key={p.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              {p.imageUrl && (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-16 object-cover rounded-md mb-2" />
                              )}
                              <div className="flex justify-between">
                                <span className="text-sm font-medium truncate">{p.name}</span>
                                <span className="text-xs text-gray-500">{p.category}</span>
                              </div>
                              {p.brand && <div className="text-xs text-gray-400">Marque: {p.brand}</div>}
                              <div className="mt-1 text-sm font-bold text-blue-600">{p.salePrice} €</div>
                              <div className="text-xs text-gray-500">Stock: {p.stock}</div>
                            </div>
                          ))}
                          {productsToShow.length === 0 && (
                            <p className="text-xs text-gray-400 col-span-4">Aucun produit</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-600" /> Offres
                  </h3>
                  <button
                    onClick={() => setSection("offres")}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Voir tout
                  </button>
                </div>
                <div className="space-y-3">
                  {proposals
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 4)
                    .map(offre => (
                      <div key={offre.id} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-medium truncate">{offre.product.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            offre.status === "EN_ATTENTE" ? "bg-yellow-100 text-yellow-700" :
                            offre.status === "ACCEPTEE" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          }`}>{offre.status}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Qté: {offre.quantity} | {offre.unitPrice} €
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(offre.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  {proposals.length === 0 && (
                    <p className="text-xs text-gray-400">Aucune offre</p>
                  )}
                </div>
              </div>

              <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Store className="w-4 h-4 text-orange-600" /> Annonces
                  </h3>
                  <button
                    onClick={() => setSection("annonces")}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Voir tout
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {listings
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 4)
                    .map(annonce => (
                      <div key={annonce.id} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-medium truncate">{annonce.product.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            annonce.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>{annonce.isActive ? "Active" : "Inactive"}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {annonce.quantity} u | {annonce.unitPrice} €/u
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(annonce.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  {listings.length === 0 && (
                    <p className="text-xs text-gray-400 col-span-2">Aucune annonce</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Assistant IA Vendeur
                </h3>
                <button
                  onClick={() => setSection("ia")}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Voir les recommandations →
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Analysez votre catalogue et les projets disponibles avec l’IA.
              </p>
            </div>
          </div>
        );

      case "catalogue":
        if (activeCatalogId) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {activeCatalog ? activeCatalog.name : "Catalogue"}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedCatalogId(null);
                      const params = new URLSearchParams(window.location.search);
                      params.set("section", "catalogue");
                      params.delete("catalog");
                      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
                    }}
                    className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition flex items-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180" /> Retour à tous les catalogues
                  </button>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {activeCatalog ? activeCatalog.name : "Catalogue"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportCatalogId(activeCatalogId || selectedCatalogId || "");
                      setImportNewCatalogName("");
                      setShowImportModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
                  >
                    <Upload className="w-4 h-4" /> Importer
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setFormData({
                        name: "",
                        description: "",
                        category: "",
                        brand: "",
                        purchasePrice: "",
                        salePrice: "",
                        stock: "",
                        tvaRate: "20",
                        imageUrl: "",
                        catalogId: activeCatalogId || "",
                      });
                      setShowModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un produit
                  </button>
                  <button
                    onClick={() => setShowClearCatalogModal(true)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Effacer tout
                  </button>
                  <button
                    onClick={() => router.push("/vendeur/catalogues/nouveau")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Nouveau catalogue
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Aucun produit dans ce catalogue.</p>
                  <p className="text-sm">Ajoutez votre premier produit ou importez un fichier CSV.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-800 truncate">{p.name}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{p.category}</span>
                      </div>
                      {p.brand && (
                        <div className="text-xs text-gray-400 mt-0.5">Marque: {p.brand}</div>
                      )}
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-24 object-cover rounded-md my-2" />
                      )}
                      <p className="text-sm text-gray-500 line-clamp-2">{p.description || "Aucune description"}</p>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="font-bold text-blue-600">{p.salePrice} €</span>
                        <span className={`${p.stock < 5 ? 'text-red-500' : 'text-gray-600'}`}>
                          Stock: {p.stock}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1 text-xs"
                        >
                          <Edit className="w-3 h-3" /> Modifier
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-1 text-xs"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (catalogGroups.length === 0) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Aucun catalogue disponible.</p>
              <p className="text-sm mt-1">Créez votre premier catalogue pour commencer.</p>
            </div>
          );
        }

        return (
          <div className="space-y-5">
            {catalogGroups.map((group) => {
              const previewProducts = [...group.products]
                .sort(() => Math.random() - 0.5)
                .slice(0, catalogGroups.length === 1 ? 8 : 4);

              return (
                <div key={group.catalog.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{group.catalog.name}</h3>
                      <p className="text-xs text-gray-500">{group.products.length} produit{group.products.length > 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCatalogId(group.catalog.id);
                        const params = new URLSearchParams(window.location.search);
                        params.set("section", "catalogue");
                        params.set("catalog", group.catalog.id);
                        window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      Voir le catalogue
                    </button>
                  </div>

                  {previewProducts.length === 0 ? (
                    <div className="text-sm text-gray-500">Aucun produit dans ce catalogue.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {previewProducts.map((p) => (
                        <div key={p.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-20 object-cover rounded-md mb-2" />
                          )}
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-medium text-gray-800 text-sm truncate">{p.name}</h4>
                            <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600">{p.category}</span>
                          </div>
                          {p.brand && <div className="text-xs text-gray-400 mt-0.5">Marque: {p.brand}</div>}
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="font-bold text-blue-600">{p.salePrice} €</span>
                            <span className={`${p.stock < 5 ? 'text-red-500' : 'text-gray-600'}`}>
                              Stock: {p.stock}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case "projets":
        return (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Projets disponibles</h2>
            {availableProjects.length === 0 ? (
              <p className="text-gray-500">Aucun projet disponible pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableProjects.map(proj => (
                  <div key={proj.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{proj.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        proj.color === "green" ? "bg-green-100 text-green-700" :
                        proj.color === "orange" ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {proj.color === "green" ? "Disponible" :
                         proj.color === "orange" ? "Stock partiel" : "Rupture"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Client: {proj.clientName}</p>
                    <p className="text-sm text-gray-500">Surface: {proj.surface ?? "N/A"} m²</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(proj.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => {
                        setOfferProjectId(proj.id);
                        document.getElementById("offer-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Faire une offre
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "offres":
        return (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📨 Offres envoyées</h2>
            {proposals.length === 0 ? (
              <p className="text-gray-500">Aucune offre envoyée.</p>
            ) : (
              <div className="space-y-3">
                {proposals.map(offre => (
                  <div key={offre.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {offre.product.name}
                        {offre.product.brand && <span className="text-sm text-gray-400 ml-1">({offre.product.brand})</span>}
                      </p>
                      <p className="text-sm text-gray-600">Projet: {offre.project?.name || "N/A"}</p>
                      <p className="text-sm">Quantité: {offre.quantity} | Prix unitaire: {offre.unitPrice} €</p>
                      <p className="text-xs text-gray-400">Statut: {offre.status}</p>
                      {offre.marketingMessage && (
                        <p className="text-xs text-gray-500 italic">“{offre.marketingMessage}”</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {offre.status === "EN_ATTENTE" && (
                        <button
                          onClick={() => cancelProposal(offre.id)}
                          className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                        >
                          Annuler
                        </button>
                      )}
                      {offre.status === "EXPIREE" && (
                        <button
                          onClick={() => openRelaunchModal(offre)}
                          className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200"
                        >
                          Relancer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "annonces":
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">📢 Mes annonces</h2>
              <button
                onClick={() => setShowListingModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
              >
                <Plus className="w-4 h-4 inline mr-1" /> Nouvelle annonce
              </button>
            </div>
            {listings.length === 0 ? (
              <p className="text-gray-500">Aucune annonce publiée.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listings.map(ann => (
                  <div key={ann.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between">
                      <h3 className="font-medium">
                        {ann.product.name}
                        {ann.product.brand && <span className="text-sm text-gray-400 ml-1">({ann.product.brand})</span>}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${ann.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {ann.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Quantité: {ann.quantity} | Prix unitaire: {ann.unitPrice} € | Prix total: {(ann.quantity * ann.unitPrice).toFixed(2)} €
                    </p>
                    {ann.endDate && <p className="text-sm text-gray-600">Fin de l’offre: {new Date(ann.endDate).toLocaleDateString()}</p>}
                    {ann.description && <p className="text-sm text-gray-500 mt-1">{ann.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">Créée le {new Date(ann.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "ia":
        return (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">🤖 Assistant IA Vendeur</h2>
              <button
                onClick={fetchAISuggestions}
                disabled={aiLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? "Analyse en cours..." : "Analyser les projets"}
              </button>
            </div>

            {aiSuggestions.length === 0 && !aiLoading && (
              <div className="bg-white border border-purple-200 rounded-lg p-5 text-gray-600">
                Cliquez sur le bouton pour analyser les projets disponibles et obtenir des recommandations IA à partir du catalogue du vendeur.
              </div>
            )}

            {aiLoading && <p className="text-gray-500">Chargement des recommandations IA...</p>}

            {!aiLoading && aiSuggestions.length > 0 && (
              <div className="space-y-4">
                {aiSuggestions.map((suggestion) => (
                  <div key={suggestion.projectId} className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h4 className="font-semibold text-purple-800">{suggestion.projectName}</h4>
                      <span className="text-[10px] uppercase tracking-wide bg-purple-100 text-purple-700 px-2 py-1 rounded-full">IA</span>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{suggestion.summary}</p>

                    {suggestion.recommendedProducts.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Produits recommandés</p>
                        <div className="space-y-2">
                          {suggestion.recommendedProducts.map((product, index) => (
                            <div key={`${suggestion.projectId}-${index}`} className="rounded-md border border-gray-200 bg-gray-50 p-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-gray-800">{String(product.name || 'Produit')}</span>
                                <span className="text-xs text-blue-700 font-medium">{Number(product.price || 0).toFixed(2)} €</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{String(product.justification || '')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestion.recommendedTutorials.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Tutoriels</p>
                        <div className="space-y-2">
                          {suggestion.recommendedTutorials.map((tutorial, index) => (
                            <div key={`${suggestion.projectId}-tutorial-${index}`} className="rounded-md border border-gray-200 bg-white p-2">
                              <p className="text-sm font-medium text-gray-800">{String(tutorial.title || 'Tutoriel')}</p>
                              <p className="text-xs text-gray-500">{String(tutorial.description || '')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestion.questions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Questions</p>
                        <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
                          {suggestion.questions.map((question, index) => (
                            <li key={`${suggestion.projectId}-question-${index}`}>{question}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="rounded-md bg-purple-50 border border-purple-200 p-2">
                      <p className="text-xs font-semibold uppercase text-purple-700 mb-1">Action suivante</p>
                      <p className="text-sm text-purple-800">{suggestion.nextAction}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (checkingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (hasActiveAgent === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <Sparkles className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🚀 Activez votre agent</h2>
          <p className="text-gray-600 mb-6">
            Pour accéder à votre espace vendeur et gérer vos produits, vous devez choisir un abonnement.
          </p>
          <Link
            href="/abonnement"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Voir les offres
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        onSectionChange={(section: string) => setSection(section as SectionType)}
        activeSection={section}
        onCatalogSelect={handleCatalogSelect}
        selectedCatalogId={selectedCatalogId}
      />
      <div className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📦 Agent Vendeur – {session?.user?.companyName || session?.user?.name || "Vendeur"}
            </h1>
            <p className="text-gray-500 text-sm">Gérez votre catalogue et vos offres</p>
          </div>
        </header>

        <div className="rounded-xl p-0 bg-transparent shadow-none border-0">
          {renderSection()}
        </div>

        <div id="offer-section" className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">📩 Envoyer une offre</h2>
          <form onSubmit={handleSendOffer} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Projet</label>
              <select
                value={offerProjectId}
                onChange={(e) => setOfferProjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Sélectionner un projet</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Produit</label>
              <select
                value={offerProductId}
                onChange={(e) => setOfferProductId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Sélectionner un produit</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.brand ? `(${p.brand})` : ''} (stock: {p.stock})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantité</label>
              <input
                type="number"
                value={offerQuantity}
                onChange={(e) => setOfferQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prix unitaire (€)</label>
              <input
                type="number"
                value={offerUnitPrice}
                onChange={(e) => setOfferUnitPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <input
                type="text"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Message privé"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Message marketing</label>
              <input
                type="text"
                value={offerMarketingMessage}
                onChange={(e) => setOfferMarketingMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Visible par l'artisan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de livraison</label>
              <input
                type="date"
                value={offerDeliveryDate}
                onChange={(e) => setOfferDeliveryDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={sendingOffer}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingOffer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingOffer ? "Envoi..." : "Envoyer l'offre"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODALES */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingProduct ? "Modifier" : "Ajouter"} un produit</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nom"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Marque (optionnel)"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={2}
              />
              <input
                type="text"
                placeholder="Catégorie"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
              <select
                value={formData.catalogId}
                onChange={(e) => setFormData({...formData, catalogId: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Sélectionner un catalogue</option>
                {catalogs.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Prix d'achat"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Prix de vente"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Stock"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="TVA (%)"
                  value={formData.tvaRate}
                  onChange={(e) => setFormData({...formData, tvaRate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'image</label>
                <input
                  type="text"
                  placeholder="https://... ou /uploads/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ou importer une image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700"
                />
                {uploadingImage && (
                  <p className="text-xs text-blue-600 mt-1">Téléchargement de l'image en cours...</p>
                )}
                {(uploadedImageUrl || formData.imageUrl) && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <img
                      src={uploadedImageUrl || formData.imageUrl}
                      alt="Aperçu produit"
                      className="h-20 w-full object-cover rounded-md"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      {uploadedImageUrl ? "Image importée (prioritaire)" : "Image URL utilisée"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700">
                  {editingProduct ? "Modifier" : "Ajouter"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClearCatalogModal && selectedCatalogId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Effacer tous les produits</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Cette action supprimera tous les produits du catalogue <strong>{catalogs.find(c => c.id === selectedCatalogId)?.name || "sélectionné"}</strong>.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
              Cette action est irréversible. Les produits supprimés ne seront plus accessibles dans ce catalogue.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCatalogProducts}
                className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 transition"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setShowClearCatalogModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-300 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Importer des produits</h2>

            {/* Templates téléchargeables */}
            <div className="mb-4 flex flex-wrap gap-2">
              <a
                href="/api/templates/produits.csv"
                download="template_produits.csv"
                className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Template CSV
              </a>
              <a
                href="/api/templates/produits.xlsx"
                download="template_produits.xlsx"
                className="text-sm bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Template XLSX
              </a>
            </div>

            <form onSubmit={handleImport}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fichier CSV ou XLSX <span className="text-xs text-gray-400">(utilisez les templates ci-dessus)</span>
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catalogue</label>
                <select
                  value={importCatalogId}
                  onChange={(e) => {
                    setImportCatalogId(e.target.value);
                    if (e.target.value !== "new") setImportNewCatalogName("");
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Sélectionner un catalogue</option>
                  {catalogs.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  <option value="new">+ Créer un nouveau catalogue</option>
                </select>
              </div>

              {importCatalogId === "new" && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du nouveau catalogue</label>
                  <input
                    type="text"
                    placeholder="Ex: Peinture, Électricité..."
                    value={importNewCatalogName}
                    onChange={(e) => setImportNewCatalogName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  disabled={importLoading}
                  className="flex-1 bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 disabled:opacity-50"
                >
                  {importLoading ? "Import..." : "Importer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRelaunchModal && relaunchData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Relancer l’offre</h2>
            <form onSubmit={handleRelaunch} className="space-y-3">
              <input
                type="number"
                placeholder="Quantité"
                value={relaunchData.quantity}
                onChange={(e) => setRelaunchData({...relaunchData, quantity: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Prix unitaire"
                value={relaunchData.unitPrice}
                onChange={(e) => setRelaunchData({...relaunchData, unitPrice: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                step="0.01"
                required
              />
              <input
                type="text"
                placeholder="Message"
                value={relaunchData.message}
                onChange={(e) => setRelaunchData({...relaunchData, message: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Message marketing"
                value={relaunchData.marketingMessage}
                onChange={(e) => setRelaunchData({...relaunchData, marketingMessage: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={relaunchData.deliveryDate}
                onChange={(e) => setRelaunchData({...relaunchData, deliveryDate: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-yellow-600 text-white rounded-lg px-4 py-2 hover:bg-yellow-700">
                  Relancer
                </button>
                <button type="button" onClick={() => setShowRelaunchModal(false)} className="flex-1 bg-gray-200 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-300">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showListingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Créer une annonce</h2>
            <form onSubmit={handleCreateListing} className="space-y-3">
              <select
                value={listingProductId}
                onChange={(e) => {
                  const selectedProduct = products.find((p) => p.id === e.target.value);
                  setListingProductId(e.target.value);
                  if (selectedProduct) {
                    setListingUnitPrice(String(selectedProduct.salePrice));
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Choisir un produit</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.brand ? `(${p.brand})` : ''} (stock: {p.stock})</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Quantité"
                value={listingQuantity}
                onChange={(e) => setListingQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire</label>
                <input
                  type="number"
                  placeholder="Prix unitaire"
                  value={listingUnitPrice}
                  onChange={(e) => setListingUnitPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix total</label>
                <div className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2 text-gray-800 font-semibold">
                  {listingTotalPrice.toFixed(2)} €
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <input
                  type="date"
                  value={listingEndDate}
                  onChange={(e) => setListingEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <textarea
                placeholder="Description (optionnelle)"
                value={listingDescription}
                onChange={(e) => setListingDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={2}
              />
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={sendingListing} className="flex-1 bg-orange-600 text-white rounded-lg px-4 py-2 hover:bg-orange-700 disabled:opacity-50">
                  {sendingListing ? "Création..." : "Créer l'annonce"}
                </button>
                <button type="button" onClick={() => setShowListingModal(false)} className="flex-1 bg-gray-200 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-300">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
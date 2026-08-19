"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Trash2, Lightbulb, RefreshCw, User, ShoppingBag, Store } from "lucide-react";
import { PDFDownloadLink } from '@react-pdf/renderer';
import DevisPDF from './DevisPDF';
import SuggestionsIA from './SuggestionsIA';

type Project = {
  id: string;
  name: string;
  status: string;
  budgetEstimate: number | null;
  description: string | null;
};

type ProjectItem = {
  id: string;
  quantity: number;
  unitPriceHtAtSale: number;
  tvaRate: number;
  product?: { name: string; salePrice: number };
  service?: { name: string; unitPriceHt: number };
  customLabel?: string;
  customPrice?: number;
};

type RemovedProduct = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  isClientProvided: boolean;
};

type VendorProposal = {
  id: string;
  productId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  status: string;
  message: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
  };
  vendor: {
    id: string;
    name: string | null;
    companyName: string | null;
  };
};

type Listing = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  product: {
    name: string;
    category: string;
    salePrice: number;
  };
  vendor: {
    companyName: string | null;
    name: string | null;
  };
};

export default function ProjetEditorPage() {
  const params = useParams();
  const projectId = params.id as string;

  // ========== ÉTATS ==========
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [removedProducts, setRemovedProducts] = useState<RemovedProduct[]>([]);
  const [proposals, setProposals] = useState<VendorProposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // ===== TVA =====
  const [tvaRate, setTvaRate] = useState<number>(20);
  const [countryCode, setCountryCode] = useState<string>('');
  const [countryName, setCountryName] = useState<string>('');

  // Debounce
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // ========== CHARGEMENT ==========
  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Erreur chargement projet");
      const data = await res.json();
      setProject(data);
    } catch (error) {
      console.error("Erreur chargement projet :", error);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/items`, { credentials: 'include' });
      if (!res.ok) throw new Error("Erreur chargement items");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Erreur chargement items :", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products", { credentials: 'include' });
      if (!res.ok) throw new Error("Erreur chargement produits");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erreur chargement produits :", error);
    }
  };

  const fetchServices = async () => {
    try {
      const standardRes = await fetch("/api/services", { credentials: 'include' });
      const standardServices = standardRes.ok ? await standardRes.json() : [];

      const userRes = await fetch("/api/user/services", { credentials: 'include' });
      const userServices = userRes.ok ? await userRes.json() : [];

      const formattedUserServices = userServices.map((s: any) => ({
        id: s.id,
        name: s.name,
        unit: s.unit,
        unitPriceHt: s.unitPrice,
        tvaRate: 20,
        isUserService: true,
      }));

      const formattedStandardServices = standardServices.map((s: any) => ({
        ...s,
        isUserService: false,
      }));

      setServices([...formattedStandardServices, ...formattedUserServices]);
    } catch (error) {
      console.error("Erreur chargement services :", error);
    }
  };

  const fetchProposals = async () => {
    setProposalsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/proposals`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProposals(data.filter((p: VendorProposal) => p.status === 'EN_ATTENTE'));
      } else {
        setProposals([]);
      }
    } catch (error) {
      console.error("Erreur chargement propositions :", error);
      setProposals([]);
    } finally {
      setProposalsLoading(false);
    }
  };

  const fetchListings = async () => {
    setListingsLoading(true);
    try {
      const res = await fetch('/api/artisan/listings', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setListings(data);
      } else {
        setListings([]);
      }
    } catch (error) {
      console.error("Erreur chargement annonces :", error);
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const res = await fetch(`/api/agent/conversation?projectId=${projectId}`, { credentials: 'include' });
      if (!res.ok) {
        setChatMessages([]);
        return;
      }
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (error) {
      console.error('Erreur chargement conversation IA :', error);
      setChatMessages([]);
    }
  };

  const handleAskAssistant = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    setChatLoading(true);
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    try {
      const res = await fetch('/api/agent/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur IA');
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: data.answer || 'Aucune réponse disponible.',
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erreur envoi message IA :', error);
      setChatMessages((prev) => [...prev, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: 'Impossible de répondre pour le moment. Merci de réessayer.',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ========== DÉTECTION TVA ==========
  useEffect(() => {
    const detectCountryAndVAT = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const code = data.country_code || 'FR';
        const name = data.country_name || 'France';
        setCountryCode(code);
        setCountryName(name);
        const tvaRates: Record<string, number> = {
          'FR': 20, 'LB': 11, 'SY': 0, 'SA': 15, 'AE': 5,
          'QA': 0, 'KW': 0, 'OM': 5, 'BH': 10, 'EG': 14,
          'JO': 16, 'IQ': 0, 'IR': 9, 'TR': 20, 'DE': 19,
          'IT': 22, 'ES': 21, 'UK': 20, 'US': 0, 'CA': 5,
          'AU': 10,
        };
        const rate = tvaRates[code] || 20;
        setTvaRate(rate);
      } catch (error) {
        console.error('Erreur détection pays:', error);
        setCountryCode('FR');
        setCountryName('France');
        setTvaRate(20);
      }
    };
    detectCountryAndVAT();
  }, []);

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    const load = async () => {
      await fetchProject();
      await fetchItems();
      await fetchProducts();
      await fetchServices();
      await fetchProposals();
      await fetchListings();
      await fetchChatMessages();
      setLoading(false);
    };
    load();
  }, [projectId]);

  // ========== AJOUTER UN ITEM ==========
  const addItem = async (itemData: any) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/items`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erreur : " + (err.error || "Impossible d'ajouter"));
        return;
      }
      await fetchItems();
      await fetchProposals();
    } catch (error) {
      console.error("Erreur ajout item :", error);
      alert("Erreur lors de l'ajout");
    }
  };

  // ========== SUPPRIMER UN ITEM ==========
  const deleteItem = async (itemId: string) => {
    if (!confirm("Supprimer cette ligne ?")) return;
    if (isDeleting[itemId]) return;
    setIsDeleting(prev => ({ ...prev, [itemId]: true }));

    try {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const name = item.customLabel || item.product?.name || item.service?.name || "Produit inconnu";
        const price = item.unitPriceHtAtSale || item.customPrice || 0;
        setRemovedProducts(prev => [
          ...prev,
          {
            id: `removed-${Date.now()}`,
            name,
            quantity: item.quantity,
            unitPrice: price,
            unit: "m²",
            isClientProvided: false,
          }
        ]);
      }
      const res = await fetch(`/api/projects/${projectId}/items/${itemId}`, {
        method: "DELETE",
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Erreur suppression");
      await fetchItems();
      await fetchProposals();
    } catch (error) {
      console.error("Erreur suppression :", error);
      await fetchItems();
      alert("Erreur lors de la suppression");
    } finally {
      setIsDeleting(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // ========== RÉINTÉGRER ==========
  const reintegrateProduct = async (productId: string) => {
    const product = removedProducts.find(p => p.id === productId);
    if (!product) return;
    await addItem({
      customLabel: product.name,
      customPrice: product.unitPrice,
      quantity: product.quantity,
    });
    setRemovedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // ========== TOGGLE CLIENT ==========
  const toggleClientProvided = (productId: string) => {
    setRemovedProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, isClientProvided: !p.isClientProvided } : p
      )
    );
  };

  // ========== ACCEPTER UNE OFFRE ==========
  const acceptProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'ACCEPTE' }),
      });
      if (!res.ok) throw new Error('Erreur acceptation');
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        await addItem({
          customLabel: proposal.product.name,
          customPrice: proposal.unitPrice,
          quantity: proposal.quantity,
        });
      }
      await fetchProposals();
    } catch (error) {
      console.error("Erreur acceptation :", error);
      alert("Erreur lors de l'acceptation");
    }
  };

  // ========== REFUSER UNE OFFRE ==========
  const refuseProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'REFUSE' }),
      });
      if (!res.ok) throw new Error('Erreur refus');
      await fetchProposals();
    } catch (error) {
      console.error("Erreur refus :", error);
      alert("Erreur lors du refus");
    }
  };

  // ========== PRIX ==========
  const updateItemPrice = async (itemId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, unitPriceHtAtSale: newPrice } : item
      )
    );
    if (debounceTimers.current[itemId]) clearTimeout(debounceTimers.current[itemId]);
    debounceTimers.current[itemId] = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}/items/${itemId}`, {
          method: "PUT",
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ unitPriceHtAtSale: newPrice }),
        });
      } catch (error) {
        console.error("Erreur mise à jour prix :", error);
        await fetchItems();
      }
    }, 500);
  };

  // ========== QUANTITÉ ==========
  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
    if (debounceTimers.current[`qty-${itemId}`]) clearTimeout(debounceTimers.current[`qty-${itemId}`]);
    debounceTimers.current[`qty-${itemId}`] = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}/items/${itemId}`, {
          method: "PUT",
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ quantity: newQuantity }),
        });
      } catch (error) {
        console.error("Erreur mise à jour quantité :", error);
        await fetchItems();
      }
    }, 500);
  };

  // ========== TOTAUX ==========
  const totalHT = items.reduce((sum, item) => {
    const price = item.unitPriceHtAtSale || item.customPrice || 0;
    return sum + price * item.quantity;
  }, 0);
  const totalTVA = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + totalTVA;

  if (loading) return <div className="p-8 text-center text-gray-500">⏳ Chargement...</div>;
  if (!project) return <div className="p-8 text-center text-red-500">❌ Projet introuvable</div>;

  const pdfItems = items.map((item) => ({
    name: item.product?.name || item.service?.name || item.customLabel || "—",
    quantity: item.quantity,
    price: item.unitPriceHtAtSale || item.customPrice || 0,
    tvaRate: tvaRate,
    total: (item.unitPriceHtAtSale || item.customPrice || 0) * item.quantity,
  }));

  return (
    <div>
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-sm text-gray-500">Statut : {project.status}</p>
        </div>
        <div className="flex gap-2">
          <PDFDownloadLink
            document={
              <DevisPDF
                projectName={project.name}
                projectStatus={project.status}
                items={pdfItems}
                totalHT={totalHT}
                totalTVA={totalTVA}
                totalTTC={totalTTC}
              />
            }
            fileName={`devis_${project.name}.pdf`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            {({ loading }) => (loading ? '⏳ Génération...' : '📄 Télécharger PDF')}
          </PDFDownloadLink>
        </div>
      </div>

      {/* ===== SPLIT SCREEN ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GAUCHE : Devis (2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-blue-700">TVA :</span>
                <span className="px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-700">
                  {tvaRate}% {countryCode && `(${countryCode})`}
                </span>
                <span className="text-xs text-gray-500">
                  {countryName ? `Détecté : ${countryName}` : 'Détection automatique'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Total HT : <strong className="text-gray-800">{totalHT.toFixed(2)} €</strong></span>
                <span className="text-gray-600">TVA : <strong className="text-blue-600">{totalTVA.toFixed(2)} €</strong></span>
                <span className="text-gray-600">Total TTC : <strong className="text-blue-800 text-base">{totalTTC.toFixed(2)} €</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Qté</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prix unitaire HT</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">TVA</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total HT</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Aucun produit ou prestation ajouté</td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const name = item.product?.name || item.service?.name || item.customLabel || "—";
                      const price = item.unitPriceHtAtSale || item.customPrice || 0;
                      const total = price * item.quantity;
                      return (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 text-base font-medium text-gray-800 min-w-[180px]">{name}</td>
                          <td className="px-6 py-4 text-sm">
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) updateItemQuantity(item.id, val);
                              }}
                              className="w-16 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 text-sm"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <input
                              type="number"
                              step="0.01"
                              value={price.toFixed(2)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) updateItemPrice(item.id, val);
                              }}
                              className="w-24 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 text-sm"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm">{tvaRate}%</td>
                          <td className="px-6 py-4 text-sm font-medium">{total.toFixed(2)} €</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <button
                              onClick={() => deleteItem(item.id)}
                              disabled={isDeleting[item.id]}
                              className={`text-red-600 hover:text-red-800 transition ${isDeleting[item.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* DROITE : Assistance IA */}
        <div className="lg:col-span-1">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 h-full">
            <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Assistance IA
            </h3>

            {/* ===== SUGGESTIONS IA ===== */}
            <SuggestionsIA projectId={projectId} onAddItem={addItem} existingItems={items} />

            <div className="mt-5 border-t border-blue-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-blue-800">💬 Assistant projet</p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto bg-white border border-blue-100 rounded-lg p-2">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-gray-500">Aucune conversation pour le moment.</p>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-md p-2 text-xs ${
                        message.role === 'assistant'
                          ? 'bg-blue-50 text-gray-700 border border-blue-100'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className="font-semibold mb-1">
                        {message.role === 'assistant' ? 'Assistant' : 'Vous'}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  rows={2}
                  placeholder="Posez une question à l’IA..."
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleAskAssistant}
                disabled={chatLoading || !chatInput.trim()}
                className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {chatLoading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>

            {/* ===== OFFRES DES VENDEURS (propositions) ===== */}
            {/* ===== OFFRES DES VENDEURS ===== */}
{proposalsLoading ? (
  <div className="border-2 border-dashed border-green-400 bg-white p-3 rounded-lg mt-3 text-center text-sm text-gray-500">
    ⏳ Chargement des offres...
  </div>
) : proposals.length > 0 ? (
  <div className="border-2 border-dashed border-green-400 bg-green-50 p-3 rounded-lg mt-3">
    <p className="text-sm font-medium text-green-800 flex items-center gap-1">
      <ShoppingBag className="w-4 h-4" /> Offres des vendeurs
      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full ml-2">
        {proposals.filter(p => p.status === 'EN_ATTENTE').length} nouvelles
      </span>
    </p>
    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
      {proposals.map((proposal) => {
        const isNew = proposal.status === 'EN_ATTENTE' && new Date(proposal.createdAt) > new Date(Date.now() - 5 * 60 * 1000);
        return (
          <div
            key={proposal.id}
            className={`bg-white p-2 rounded border-2 ${
              isNew ? 'border-green-500 shadow-md' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{proposal.product.name}</span>
                <span className="text-xs text-gray-500 ml-2">{proposal.quantity} unités</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">{proposal.unitPrice} €</span>
                <span className="text-xs text-gray-500">{proposal.vendor.companyName || proposal.vendor.name}</span>
              </div>
            </div>
            {proposal.message && <p className="text-xs text-gray-600 mt-1 italic">"{proposal.message}"</p>}
            {isNew && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
                Nouvelle offre reçue !
              </p>
            )}
            {proposal.status === 'EN_ATTENTE' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => acceptProposal(proposal.id)}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Accepter
                </button>
                <button
                  onClick={() => refuseProposal(proposal.id)}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Refuser
                </button>
              </div>
            )}
            {proposal.status === 'ACCEPTE' && (
              <p className="text-xs text-green-600 mt-1">✅ Offre acceptée</p>
            )}
            {proposal.status === 'REFUSE' && (
              <p className="text-xs text-red-600 mt-1">❌ Offre refusée</p>
            )}
          </div>
        );
      })}
    </div>
  </div>
) : (
  <div className="border-2 border-dashed border-green-300 bg-white p-3 rounded-lg mt-3 text-center text-sm text-gray-500">
    🛒 Aucune offre de vendeur pour le moment.
  </div>
)}

            {/* ===== ANNONCES DE STOCK (listings) ===== */}
            {listingsLoading ? (
              <div className="border-2 border-dashed border-purple-400 bg-white p-3 rounded-lg mt-3 text-center text-sm text-gray-500">
                ⏳ Chargement des annonces...
              </div>
            ) : listings.length > 0 ? (
              <div className="border-2 border-dashed border-purple-400 bg-purple-50 p-3 rounded-lg mt-3">
                <p className="text-sm font-medium text-purple-800 flex items-center gap-1">
                  <Store className="w-4 h-4" /> Annonces de stock (vendeurs)
                </p>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {listings.map((listing) => (
                    <div key={listing.id} className="bg-white p-2 rounded border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{listing.product.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{listing.quantity} unités</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-purple-600">{listing.unitPrice} €</span>
                          <span className="text-xs text-gray-500">{listing.vendor.companyName || listing.vendor.name}</span>
                        </div>
                      </div>
                      {listing.description && <p className="text-xs text-gray-600 mt-1 italic">"{listing.description}"</p>}
                      <button
                        onClick={async () => {
                          if (confirm(`Ajouter ${listing.quantity} ${listing.product.name} à ce projet ?`)) {
                            await addItem({
                              customLabel: listing.product.name,
                              customPrice: listing.unitPrice,
                              quantity: listing.quantity,
                            });
                            alert('✅ Produit ajouté au devis !');
                          }
                        }}
                        className="mt-1 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                      >
                        Ajouter au devis
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-purple-300 bg-white p-3 rounded-lg mt-3 text-center text-sm text-gray-500">
                📦 Aucune annonce de stock disponible.
              </div>
            )}

            {/* ===== PRODUITS RETIRÉS ===== */}
            {removedProducts.length > 0 && (
              <div className="border-2 border-dashed border-yellow-400 bg-yellow-50 p-3 rounded-lg mt-3">
                <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> Produits retirés
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Ces produits ont été retirés du devis. Si votre client les fournit lui-même, cochez la case ci-dessous.
                </p>
                <div className="mt-2 space-y-2">
                  {removedProducts.map((product) => (
                    <div key={product.id} className="flex flex-col bg-white p-2 rounded border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex-1 font-medium">{product.name}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={product.isClientProvided}
                              onChange={() => toggleClientProvided(product.id)}
                              className="w-3 h-3"
                            />
                            <User className="w-3 h-3" /> Client
                          </label>
                          <button
                            onClick={() => reintegrateProduct(product.id)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Réintégrer
                          </button>
                        </div>
                      </div>
                      {product.isClientProvided && (
                        <div className="mt-1 text-xs text-green-600 bg-green-50 p-1 rounded">
                          ✅ Fourni par le client – Le prix est retiré du devis
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== CONSEIL MÉTIER ===== */}
            <div className="border-2 border-dashed border-blue-300 bg-white p-3 rounded-lg mt-3">
              <p className="text-sm font-medium text-blue-800">💡 Conseil métier</p>
              <p className="text-xs text-gray-600 mt-1">
                Si votre client fournit les matériaux, n'oubliez pas d'ajuster votre marge sur la pose.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
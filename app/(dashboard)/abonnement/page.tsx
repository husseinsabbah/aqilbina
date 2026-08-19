"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Loader2, Crown, Store, Building2, Sparkles, AlertCircle } from "lucide-react";

const ARTISAN_TRADES = [
  "Carrelage",
  "Plomberie",
  "Électricité",
  "Peinture",
  "Menuiserie",
  "Maçonnerie",
  "Couvreur",
  "Isolation",
  "Climatisation",
  "Chauffage",
  "Ventilation",
  "Étanchéité",
  "Ferronnerie",
  "Serrurerie",
  "Vitrerie",
  "Autre",
];

const AGENT_NAME_SUGGESTIONS = ARTISAN_TRADES;

const normalizeSuggestion = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getClosestSuggestion = (value: string) => {
  const cleanValue = normalizeSuggestion(value);
  if (!cleanValue) return "";

  const exact = AGENT_NAME_SUGGESTIONS.find((option) => normalizeSuggestion(option) === cleanValue);
  if (exact) return exact;

  let bestMatch = "";
  let bestScore = 0;

  AGENT_NAME_SUGGESTIONS.forEach((option) => {
    const optionNormalized = normalizeSuggestion(option);
    if (!optionNormalized) return;

    const startsWithScore = optionNormalized.startsWith(cleanValue) || cleanValue.startsWith(optionNormalized) ? 0.9 : 0;
    const includesScore = optionNormalized.includes(cleanValue) || cleanValue.includes(optionNormalized) ? 0.7 : 0;
    const overlap = [...new Set(cleanValue.split(""))].filter((char) => optionNormalized.includes(char)).length;
    const overlapScore = overlap > 0 ? overlap / Math.max(cleanValue.length, optionNormalized.length) : 0;
    const score = Math.max(startsWithScore, includesScore, overlapScore);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = option;
    }
  });

  return bestScore >= 0.3 ? bestMatch : "";
};

const getSuggestions = (query: string) => {
  const cleanValue = normalizeSuggestion(query);
  if (!cleanValue) return AGENT_NAME_SUGGESTIONS;

  return [...AGENT_NAME_SUGGESTIONS]
    .filter((option) => normalizeSuggestion(option).includes(cleanValue) || cleanValue.includes(normalizeSuggestion(option)))
    .slice(0, 6);
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

export default function AbonnementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [agentNames, setAgentNames] = useState<string[]>([""]);
  const [activeNameInput, setActiveNameInput] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents", { credentials: "include" });
        if (!res.ok) throw new Error("Erreur");
        const data = await res.json();
        setAgents(data.filter((a: Agent) => a.isActive));
      } catch {
        setError("Impossible de charger les offres");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [session, status, router]);

  const handleChoose = (agent: Agent) => {
    setSelectedAgent(agent);
    setQuantity(1);
    setAgentNames([agent.specialty || "Carrelage"]);
    setActiveNameInput(0);
    setShowModal(true);
  };

  const updateAgentCount = (nextQuantity: number) => {
    const safeQuantity = Math.max(1, Number.isFinite(nextQuantity) ? nextQuantity : 1);
    setQuantity(safeQuantity);
    setAgentNames((prev) => {
      const nextNames = Array.from({ length: safeQuantity }, (_, index) => prev[index]?.trim() || "");
      if (safeQuantity === 1 && !nextNames[0]) {
        nextNames[0] = selectedAgent?.specialty || "Carrelage";
      }
      return nextNames;
    });
  };

  const handleConfirm = async () => {
    if (!selectedAgent) return;

    const fixedNames = Array.from({ length: quantity }, (_, index) => {
      const rawValue = (agentNames[index] || "").trim();
      if (!rawValue) {
        return selectedAgent.specialty || "Carrelage";
      }
      return getClosestSuggestion(rawValue) || rawValue;
    });

    const hasDuplicateNames = new Set(fixedNames.map((name) => name.toLowerCase())).size !== fixedNames.length;
    if (hasDuplicateNames) {
      setError("Les noms d'agents doivent être différents pour chaque agent.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/user/agents/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId: selectedAgent.id,
          quantity: quantity,
          agentNames: fixedNames,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      setShowModal(false);
      // Rediriger vers l'espace approprié
      const role = session?.user?.role;
      const trade = session?.user?.trade;
      if (role === "vendeur" || trade === "vendeur") {
        router.push("/vendeur");
      } else if (role === "artisan" || trade === "artisan") {
        router.push("/artisan");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            🔥 Choisissez votre agent IA
          </h1>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
            Des agents spécialisés pour vous accompagner au quotidien.
            <span className="block text-blue-600 font-semibold mt-2">
              ✅ 14 jours d&apos;essai gratuit offerts – Aucune carte demandée.
            </span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-700 flex items-center gap-2 max-w-3xl mx-auto">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent) => {
            const isPopular = agent.priceMonthly === 99 && agent.type === "societe";
            return (
              <div
                key={agent.id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden border transition-all hover:shadow-xl ${
                  isPopular ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2" : "border-gray-200"
                }`}
              >
                {isPopular && (
                  <div className="bg-blue-600 text-white text-center text-sm font-semibold py-1.5">
                    ⭐ Le plus populaire
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    {agent.type === "artisan" && <Crown className="w-6 h-6 text-yellow-500" />}
                    {agent.type === "vendeur" && <Store className="w-6 h-6 text-blue-500" />}
                    {agent.type === "societe" && <Building2 className="w-6 h-6 text-purple-500" />}
                    {agent.type === "sur-mesure" && <Sparkles className="w-6 h-6 text-indigo-500" />}
                    <h3 className="text-xl font-bold text-gray-800">{agent.name}</h3>
                  </div>
                  {agent.specialty && (
                    <p className="text-sm text-gray-500 mb-2">Spécialité : {agent.specialty}</p>
                  )}
                  <p className="text-gray-600 text-sm mb-4">{agent.description || "Agent polyvalent"}</p>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">{agent.priceMonthly}€</span>
                    <span className="text-gray-500 text-sm"> /mois</span>
                    {agent.priceYearly > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        ou {agent.priceYearly}€ /an (économie de 10%)
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {agent.type === "artisan" ? "5 projets / mois" : agent.type === "vendeur" ? "20 projets / mois" : "Illimité"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {agent.type === "artisan" ? "10 offres / mois" : agent.type === "vendeur" ? "50 offres / mois" : "Illimité"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {agent.type === "artisan" ? "IA basique" : agent.type === "vendeur" ? "IA avancée" : "IA Pro"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {agent.type === "artisan" ? "Support standard" : agent.type === "vendeur" ? "Support prioritaire" : "Support 24/7"}
                    </li>
                  </ul>
                  <button
                    onClick={() => handleChoose(agent)}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    {agent.type === "sur-mesure" ? "Contactez-nous" : "Commencer votre essai de 14 jours gratuit"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">❓ Questions fréquentes</h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-700">Comment fonctionne l&apos;essai gratuit ?</h4>
              <p className="text-gray-600 text-sm">Vous bénéficiez de 14 jours d&apos;essai complet, sans fournir de carte bancaire. Au 15e jour, vous serez invité à payer pour continuer.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">Puis-je arrêter l&apos;essai avant la fin ?</h4>
              <p className="text-gray-600 text-sm">Oui, vous pouvez arrêter à tout moment. Vos données seront conservées 30 jours au cas où vous reviendriez.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">Que se passe-t-il après l&apos;essai ?</h4>
              <p className="text-gray-600 text-sm">Vous recevrez un rappel, puis votre carte sera débitée automatiquement si vous avez souscrit. Sinon, le service sera suspendu.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de sélection */}
      {showModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Fermer</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4">Personnalisez votre abonnement</h2>
            <p className="text-gray-600 mb-4">
              Vous avez choisi : <strong>{selectedAgent.name}</strong> ({selectedAgent.priceMonthly}€/mois)
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre d&apos;agents (1 inclus)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => updateAgentCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                {quantity === 1
                  ? "1 agent inclus"
                  : `${quantity} agents (${selectedAgent.priceMonthly * quantity}€ / mois)`}
              </p>
            </div>

            <div className="space-y-3 mb-4">
              {Array.from({ length: quantity }, (_, index) => {
                const value = agentNames[index] || "";
                const suggestions = getSuggestions(value);
                const selectedTrade = value === "" ? (selectedAgent.specialty || "Carrelage") : value;
                const isOtherSelected = selectedTrade === "Autre" || !ARTISAN_TRADES.includes(selectedTrade);

                return (
                  <div key={index} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quel métier ?
                    </label>

                    <select
                      value={isOtherSelected ? "Autre" : selectedTrade}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setAgentNames((prev) => {
                          const updated = [...prev];
                          updated[index] = nextValue;
                          return updated;
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {ARTISAN_TRADES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>

                    {isOtherSelected && (
                      <input
                        type="text"
                        value={selectedTrade === "Autre" ? "" : selectedTrade}
                        onChange={(e) => {
                          const nextValue = e.target.value.trim();
                          setAgentNames((prev) => {
                            const updated = [...prev];
                            updated[index] = nextValue || "Autre";
                            return updated;
                          });
                        }}
                        placeholder="Précisez votre métier"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:ring-2 focus:ring-blue-500"
                      />
                    )}

                    {!isOtherSelected && suggestions.length > 0 && value && getClosestSuggestion(value) && getClosestSuggestion(value) !== value && (
                      <p className="mt-1 text-xs text-blue-600">
                        Suggestion : <span className="font-medium">{getClosestSuggestion(value)}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-semibold">Résumé</p>
              <p>Abonnement : {selectedAgent.priceMonthly * quantity}€ / mois</p>
              <p className="text-green-600">✅ 14 jours d&apos;essai offerts</p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Activation...
                </>
              ) : (
                "Commencer votre essai de 14 jours gratuit"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
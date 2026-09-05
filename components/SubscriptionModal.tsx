"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  priceMonthly: number;
};

interface SubscriptionModalProps {
  agent: Agent;
  onClose: () => void;
  onConfirm: (quantity: number) => Promise<void>;
}

export default function SubscriptionModal({ agent, onClose, onConfirm }: SubscriptionModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onConfirm(quantity);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Personnalisez votre abonnement</h2>
        <p className="text-gray-600 mb-4">
          Vous avez choisi : <strong>{agent.name}</strong> ({agent.priceMonthly}€/mois)
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre d&apos;agents (1 inclus)
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Commencer l'essai"}
        </button>
      </div>
    </div>
  );
}
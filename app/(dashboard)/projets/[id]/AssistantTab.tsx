"use client";

import { useState } from "react";
import { Lightbulb, AlertCircle, CheckCircle, XCircle } from "lucide-react";

type Advice = {
  type: "warning" | "info" | "suggestion" | "alternative";
  title: string;
  description: string;
  action?: string;
};

export default function AssistantTab({ projectId }: { projectId: string }) {
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateAdvice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      setAdvice(data.advice || []);
      setGenerated(true);
    } catch (error) {
      console.error("Erreur génération conseils :", error);
      alert("Erreur lors de la génération des conseils");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "info": return <Lightbulb className="w-5 h-5 text-blue-600" />;
      case "suggestion": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "alternative": return <XCircle className="w-5 h-5 text-purple-600" />;
      default: return <Lightbulb className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "warning": return "bg-yellow-50 border-yellow-200";
      case "info": return "bg-blue-50 border-blue-200";
      case "suggestion": return "bg-green-50 border-green-200";
      case "alternative": return "bg-purple-50 border-purple-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">🤖 Conseils IA</h2>
        <button
          onClick={generateAdvice}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>⏳ Génération...</>
          ) : (
            <>
              <Lightbulb className="w-4 h-4" />
              Générer des conseils
            </>
          )}
        </button>
      </div>

      {!generated && !loading && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p>Cliquez sur "Générer des conseils" pour que l'IA analyse votre projet.</p>
          <p className="text-sm">Elle détectera les oublis, suggérera des quantités et proposera des alternatives.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">L'IA analyse votre projet...</p>
        </div>
      )}

      {generated && !loading && (
        <div className="space-y-4">
          {advice.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
              <p>Aucun conseil pour le moment. Votre projet semble complet !</p>
            </div>
          ) : (
            advice.map((item, index) => (
              <div
                key={index}
                className={`flex gap-4 p-4 rounded-lg border ${getBgColor(item.type)}`}
              >
                <div className="flex-shrink-0 mt-1">{getIcon(item.type)}</div>
                <div>
                  <h3 className="font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  {item.action && (
                    <p className="text-sm font-medium text-blue-600 mt-2">💡 {item.action}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
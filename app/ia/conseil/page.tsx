"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { ArrowRight, Lock, MessageSquareText, Send } from "lucide-react";

type ChatMessage = {
  from: "user" | "assistant";
  text: string;
};

const initialMessages: ChatMessage[] = [
  { from: "assistant", text: "Bonjour, quelle est votre pièce à travailler ?" },
  { from: "user", text: "Je veux refaire une salle de bain. Quels matériaux prévoir ?" },
  { from: "assistant", text: "Je vous recommande : carreaux, sous-couche, colle C2, joints et protection. Je peux aussi estimer la surface." },
];

function buildAssistantReply(input: string): string {
  const value = input.toLowerCase();

  if (value.includes("carrelage") || value.includes("salle de bain") || value.includes("carreau")) {
    return "Pour un carrelage en salle de bain, je recommande : sous-couche, colle C2, joints, carreaux, profilés et protection. Pour une surface de 12 à 15 m², comptez environ 2 à 3 sacs de colle selon l’épaisseur et les découpes.";
  }

  if (value.includes("électricit") || value.includes("prise") || value.includes("câble") || value.includes("mur")) {
    return "Avant de percer, vérifiez les zones de gaines et la présence de réseaux. Pour une installation standard, préparez les points lumineux, les prises, les boîtes de dérivation, le câble adapté et les protections électriques.";
  }

  if (value.includes("budget") || value.includes("prix") || value.includes("devis")) {
    return "Le budget dépend du type de travaux, mais une bonne méthode est de séparer la main d’œuvre et les matériaux. Si vous fournissez le matériel, le devis se concentre sur la prestation. Sinon, ajoutez les quantités estimées et les coûts de matériaux.";
  }

  if (value.includes("mur") || value.includes("fissure") || value.includes("détérioration")) {
    return "Je vous conseille d’inspecter les fissures et l’état du support avant toute rénovation. Une préparation correcte du support est essentielle pour éviter les décollements et garantir la tenue à long terme.";
  }

  return "Je peux vous aider sur le métré, les matériaux, la préparation du chantier et la planification. Donnez-moi un métier ou un type de travail, et je vous propose une première réponse concrète.";
}

export default function ConseilPage() {
  const [hasSubscription, setHasSubscription] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canChat = useMemo(() => hasSubscription, [hasSubscription]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || !canChat) return;

    const userMessage: ChatMessage = { from: "user", text: value };
    const assistantMessage: ChatMessage = { from: "assistant", text: buildAssistantReply(value) };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">IA</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Votre assistant IA du BTP</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-700">
            Des réponses concrètes, rapides et adaptées à vos métiers, directement dans votre travail quotidien.
          </p>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MessageSquareText className="h-4 w-4 text-blue-600" />
              {canChat ? "Assistant IA" : "Démonstration"}
            </div>
            <button
              onClick={() => setHasSubscription((value) => !value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {canChat ? "Simuler abonnement non actif" : "Activer le mode abonnement"}
            </button>
          </div>

          {!canChat ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 text-center">
              <Lock className="mx-auto mb-3 h-8 w-8 text-amber-600" />
              <p className="text-lg font-bold text-amber-900">Cette fonctionnalité est disponible dans nos offres Pro.</p>
              <a href="/#tarifs" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white">
                Découvrir les tarifs
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="max-h-[420px] space-y-3 overflow-y-auto p-3">
                {messages.map((message, index) => (
                  <div key={`${message.from}-${index}`} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${message.from === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  type="text"
                  placeholder="Posez votre question à l'assistant IA..."
                  className="flex-1 border-0 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button type="submit" className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

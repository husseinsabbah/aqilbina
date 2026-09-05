import { HelpCircle, MessageCircleQuestion } from "lucide-react";

const faqs = [
  {
    question: "Aqil Bina est-il adapté aux artisans ?",
    answer: "Oui. La plateforme a été pensée pour accompagner les artisans, les particuliers et les vendeurs avec des parcours et des recommandations adaptées à chaque métier du BTP.",
  },
  {
    question: "Peut-on utiliser l’outil sans formation ?",
    answer: "Oui. Les parcours sont conçus pour être simples à prendre en main, avec des conseils et des tutoriels intégrés pour guider les premiers usages.",
  },
  {
    question: "Puis-je exporter mes devis et projets ?",
    answer: "Oui. Les projets, devis et offres peuvent être suivis dans l’espace utilisateur et relancés plus facilement au bon moment.",
  },
  {
    question: "Que se passe-t-il si je n’ai pas de matériel ?",
    answer: "L’IA aide à estimer les quantités nécessaires, à identifier les bons matériaux et à préparer une proposition de devis ou d’achat plus fiable.",
  },
];

export default function AideFaqPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
          Aide
        </div>
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">FAQ</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Questions fréquentes</h1>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-1 h-5 w-5 text-amber-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{faq.question}</h2>
                  <p className="mt-2 text-slate-600">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[28px] bg-slate-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <MessageCircleQuestion className="h-6 w-6 text-sky-300" />
            <h2 className="text-xl font-bold">Une question plus précise ?</h2>
          </div>
          <p className="mt-3 text-slate-300">Notre équipe peut vous aider à configurer votre besoin ou à choisir la bonne solution.</p>
        </div>
      </section>
    </main>
  );
}

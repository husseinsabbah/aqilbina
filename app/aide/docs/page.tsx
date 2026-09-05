import Link from "next/link";
import { ArrowRight, BookText, FileText, Search } from "lucide-react";

const docs = [
  { title: "Démarrer avec Aqil Bina", text: "Comprendre l’interface, votre espace projet et les premiers gestes utiles pour gagner du temps dès le premier chantier." },
  { title: "Créer un projet de chantier", text: "Définir le besoin, la surface, les matériaux et les bonnes informations à transmettre pour obtenir un devis fiable." },
  { title: "Utiliser l’assistant IA", text: "Poser des questions, recevoir des recommandations concrètes et relancer les étapes sans perdre le fil de la commande." },
];

export default function AideDocsPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
          Aide
        </div>
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">Docs</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Documentation et guides</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {docs.map((doc) => (
            <div key={doc.title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <BookText className="mb-4 h-8 w-8 text-sky-600" />
              <h2 className="text-xl font-bold text-slate-900">{doc.title}</h2>
              <p className="mt-3 text-slate-600">{doc.text}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                <FileText className="h-4 w-4" />
                Lire le guide
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Recherche rapide</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {['Connexion', 'Projet', 'Devis', 'Certification', 'Paiement'].map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{tag}</span>
            ))}
          </div>
          <Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            Besoin d’aide plus spécifique ?
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

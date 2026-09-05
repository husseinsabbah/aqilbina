import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";

const posts = [
  { title: "Aqil Bina simplifie la sélection des matériaux sur chantier", date: "18 août 2026" },
  { title: "Comment l’IA aide les artisans à gagner du temps sans perdre leur expertise", date: "11 août 2026" },
  { title: "Les bons réflexes pour optimiser les devis en rénovation", date: "03 août 2026" },
];

export default function AideActusPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
        Aide
      </div>
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Actus</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Actualités et conseils</h1>
      </div>

      <div className="space-y-5">
        {posts.map((post) => (
          <article key={post.title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">{post.date}</div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{post.title}</h2>
              </div>
              <Newspaper className="h-8 w-8 text-emerald-600" />
            </div>
            <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              En savoir plus
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}

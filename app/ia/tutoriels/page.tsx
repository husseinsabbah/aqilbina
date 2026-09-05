import { Search } from "lucide-react";

const tutorials = [
  { category: "Carrelage", title: "Pose d'un carrelage en 2 heures", duration: "08:30" },
  { category: "Électricité", title: "Brancher une prise sans erreur", duration: "06:15" },
  { category: "Plomberie", title: "Remplacer une vanne rapidement", duration: "10:00" },
  { category: "Rénovation", title: "Préparer une chape proprement", duration: "09:10" },
  { category: "Logistique", title: "Contrôler les livraisons chantier", duration: "07:45" },
  { category: "Bâtiment", title: "Lire une planche de chantier", duration: "05:50" },
];

export default function TutorielsPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">IA</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Apprenez en faisant, guidé par l'IA</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-700">
            Des tutoriels personnalisés, étape par étape, adaptés à votre niveau et à votre projet.
          </p>
        </div>

        <div className="mb-8 flex max-w-xl items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un tutoriel"
            className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {tutorials.map((tutorial) => (
            <article key={tutorial.title} className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="aspect-video bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_40%),linear-gradient(135deg,#eff6ff,#dbeafe)] p-4">
                <div className="flex h-full items-center justify-center text-5xl">🎬</div>
              </div>
              <div className="p-5">
                <div className="mb-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                  {tutorial.category}
                </div>
                <h2 className="text-xl font-black text-slate-900">{tutorial.title}</h2>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>Durée</span>
                  <span className="font-semibold text-slate-900">{tutorial.duration}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, CheckCircle2, Headphones, Layers3 } from "lucide-react";

export default function CasquesARPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
          Appareils
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-600">Casques AR</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Une réalité augmentée utile pour le terrain
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Superposez les plans, les gaines et les repères directement dans le champ de vision du chantier pour éviter les erreurs de pose.
            </p>
            <Link href="/abonnement" className="mt-8 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700">
              Découvrir l’AR
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-purple-50 to-slate-100 p-6 shadow-lg">
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-[28px] border border-purple-200 bg-slate-900 p-4">
              <div className="relative flex h-64 w-64 items-center justify-center rounded-full border border-dashed border-white/20 bg-slate-800">
                <Headphones className="h-20 w-20 text-purple-300" />
                <div className="absolute left-8 top-10 h-20 w-20 rounded-full border border-purple-400/60" />
                <div className="absolute bottom-8 right-10 h-16 w-16 rounded-full border border-blue-400/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            "Vision des réseaux et gaines avant fermeture",
            "Vérification visuelle directe sur le chantier",
            "Moins d’erreurs et plus de sécurité"
          ].map((item) => (
            <div key={item} className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <Layers3 className="mb-4 h-8 w-8 text-purple-600" />
              <p className="text-lg font-semibold text-slate-900">{item}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Prêt pour les métiers du bâtiment</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

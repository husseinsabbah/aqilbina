import Link from "next/link";
import { ArrowRight, BatteryCharging, Camera, CheckCircle2, Smartphone, Wifi } from "lucide-react";

export default function MobilePage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          Appareils
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Mobile</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Le smartphone qui transforme le chantier en temps réel
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Utilisez votre téléphone pour scanner, mesurer, comparer et guider les équipes sans freiner les travaux.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/abonnement" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                Essai gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
                Demander un devis
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl">
            <div className="mx-auto flex h-80 max-w-xs items-center justify-center rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900 p-4 shadow-2xl">
              <div className="flex h-full w-full flex-col rounded-[24px] bg-slate-950/70 p-5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>9:41</span>
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    <BatteryCharging className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <Camera className="h-8 w-8 text-blue-400" />
                  <div>
                    <div className="text-sm text-slate-400">Scan de pièce</div>
                    <div className="text-xl font-bold">42.3 m²</div>
                  </div>
                </div>
                <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-blue-300">Précision</div>
                  <div className="mt-2 text-3xl font-black text-white">98.4%</div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Mesure automatique</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Détection de matériaux</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Prise en main rapide", text: "Aucune formation lourde. Le mobile suffit à commencer en quelques minutes." },
            { title: "Analyse sur site", text: "Photos, vidéos et mesures envoyées en temps réel à l’IA pour validation." },
            { title: "Compatibilité multi-profil", text: "Artisans, promoteurs et vendeurs bénéficient d’un workflow commun, adapté à leur métier." },
          ].map((item) => (
            <div key={item.title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <Smartphone className="mb-4 h-8 w-8 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
              <p className="mt-3 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

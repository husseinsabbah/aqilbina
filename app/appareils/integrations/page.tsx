import Link from "next/link";
import { ArrowRight, Boxes, CheckCircle2, Cpu } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          Appareils
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Intégrations</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Connectez Aqil Bina à votre environnement de travail
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Le système s’adapte à votre workflow, vos outils et vos équipes sans casser votre organisation existante.
            </p>
            <Link href="/contact" className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700">
              Demander une intégration
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-lg">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Cpu, label: "API" },
                { icon: Boxes, label: "Système de gestion" },
                { icon: CheckCircle2, label: "Workflow de chantier" },
                { icon: CheckCircle2, label: "Suivi de projet" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <Icon className="mb-3 h-7 w-7 text-emerald-600" />
                  <div className="font-semibold text-slate-900">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
        Contact
      </div>
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Nous contacter</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Parlons de votre chantier, de votre projet ou de votre besoin IA
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Que vous soyez artisan, particulier, vendeur ou promoteur, notre équipe vous aide à choisir la solution la plus adaptée à votre réalité terrain.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Phone className="h-5 w-5 text-blue-600" />
              <span className="text-slate-700">+33 6 12 34 56 78</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="text-slate-700">bonjour@aqilbina.com</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="text-slate-700">Paris · Lyon · Toulouse</span>
            </div>
          </div>
        </div>

        <form className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Vous êtes ?</label>
              <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-500">
                <option>Particulier</option>
                <option>Artisan</option>
                <option>Promoteur</option>
                <option>Vendeur</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input type="email" placeholder="vous@exemple.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Objet</label>
              <input type="text" placeholder="Demande de devis / besoin d’aide / projet" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Message</label>
              <textarea rows={5} placeholder="Décrivez votre besoin, votre chantier ou votre projet…" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-500" />
            </div>
          </div>

          <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
            Envoyer ma demande
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, Building2, Hammer, PackageCheck, Truck } from "lucide-react";

const useCases = [
  {
    title: "Artisan du bâtiment",
    description: "Évaluez le besoin, préparez les quantités, médicalisez la planification et suivez les étapes du chantier sans perdre de temps.",
    icon: Hammer,
  },
  {
    title: "Promoteur",
    description: "Centralisez les projets, les devis et les demandes d’approvisionnement pour piloter plusieurs chantiers avec plus de clarté.",
    icon: Building2,
  },
  {
    title: "Vendeur de matériaux",
    description: "Proposez des recommandations précises, gérez les offres et rapprochez votre catalogue des besoins réels des professionnels.",
    icon: PackageCheck,
  },
  {
    title: "Logistique chantier",
    description: "Contrôlez les livraisons, les palettes et les stocks en temps réel pour réduire les erreurs et sécuriser les approvisionnements.",
    icon: Truck,
  },
];

export default function CasUsagePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
        Cas d’usage
      </div>
      <div className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Aqil Bina en pratique</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Des usages concrets pour chaque métier du BTP
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {useCases.map(({ title, description, icon: Icon }) => (
          <div key={title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <Icon className="mb-4 h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-3 text-slate-600">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-[30px] bg-slate-900 p-8 text-white">
        <h2 className="text-3xl font-black">Vous avez un cas d’usage spécifique ?</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Nous pouvons vous aider à définir le bon parcours, le bon module IA et la bonne organisation pour votre équipe, votre activité et vos chantiers.</p>
        <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100">
          Parler à notre équipe
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

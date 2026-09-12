"use client";

import { ArrowRight, BadgeCheck, Building2, MessageSquareText, Search, ShieldCheck, Sparkles, Star, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { defaultLocale, getLocaleFromStorage, messages, type Locale } from "@/lib/i18n";
import SearchBar from "@/components/SearchBar";

const avatarSequence = [
  { role: "Architecte", quote: '"Je scanne l\'existant pour créer le futur."' },
  { role: "Électricien", quote: '"Je vois à travers les murs avant de percer."' },
  { role: "Conducteur de camion", quote: '"Je vérifie mes livraisons en 1 seconde."' },
  { role: "Carreleur", quote: '"Je calcule mon métré et mes chutes sans sortir le mètre."' },
];

const insightCards = [
  {
    icon: "🧱",
    title: "Je pose mon carrelage en 2x moins de temps",
    body: "Je prends une photo de la pièce. L'IA calcule instantanément la surface exacte, déduit les découpes et me sort le nombre exact de carreaux à commander, chutes comprises.",
    benefit: "Fini les allers-retours au dépôt pour du rab !",
    action: "Voir la démo Carrelage",
  },
  {
    icon: "⚡",
    title: "Je vois les tuyaux et les câbles dans le mur",
    body: "Avant de fermer un mur en placo, je filme toute l'installation. L'IA crée une superposition en réalité augmentée et me montre exactement où passent les gaines.",
    benefit: "Zéro trou dans une canalisation !",
    action: "Voir la démo Électricité",
  },
  {
    icon: "🚛",
    title: "Je contrôle mes livraisons sans papier",
    body: "Un camion arrive avec 20 palettes. Je scanne les palettes avec l'IA. Celle-ci compare en temps réel la photo des produits avec la liste de commande et détecte les erreurs.",
    benefit: "Je refuse les erreurs fournisseurs avant qu'elles ne rentrent sur le chantier !",
    action: "Voir la démo Logistique",
  },
];

const vendorList = [
  { name: "Leroy Merlin", price: 420, stock: "En stock" },
  { name: "Castorama", price: 395, stock: "Stock limité" },
  { name: "Point.P", price: 440, stock: "Disponible" },
  { name: "Bricorama", price: 470, stock: "À commander" },
];

type PublicArtisan = {
  id: string;
  name: string | null;
  companyName: string | null;
  city: string | null;
  certificationScore?: number;
  certificationLabel?: string;
  certificationBadge?: string;
};

const pricingPlans = [
  { name: "Offre Découverte", price: "0€", subtitle: "Pour tester les fonctions essentielles", perks: ["1 projet de démonstration", "Accès IA basique", "Support mail"], accent: "bg-slate-100" },
  { name: "Offre Pro", price: "29€/mois", subtitle: "Idéal pour les artisans et particuliers", perks: ["Devis IA illimités", "Suivi de chantiers", "Réservations simplifiées"], accent: "bg-blue-600 text-white" },
  { name: "Offre Entreprise", price: "Sur devis", subtitle: "Pour promoteurs, réseaux et groupes", perks: ["Multi-sites", "API & intégrations", "Gestion d'équipe"], accent: "bg-slate-900 text-white" },
];

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [needType, setNeedType] = useState<"artisan" | "materiel">("artisan");
  const [quickTarget, setQuickTarget] = useState<"all" | "artisan" | "vendeur" | "promoteur">("all");
  const [jobType, setJobType] = useState("Carreleur");
  const [materialProvidedByClient, setMaterialProvidedByClient] = useState(false);
  const [searchVendor, setSearchVendor] = useState("");
  const [budget, setBudget] = useState(4500);
  const [homeArtisans, setHomeArtisans] = useState<PublicArtisan[]>([]);
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocaleState(getLocaleFromStorage());
  }, []);

  useEffect(() => {
    if (status === "loading" || !session?.user) return;

    const role = String(session.user.role ?? session.user.trade ?? "").toLowerCase();

    if (role === "admin") {
      router.replace("/admin");
      return;
    }

    if (["artisan", "vendeur", "promoteur"].includes(role)) {
      router.replace("/dashboard");
    }
  }, [router, session, status]);

  const dict = messages[locale];

  useEffect(() => {
    const interval = setInterval(() => {
      setAvatarIndex((prev) => (prev + 1) % avatarSequence.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadArtisans = async () => {
      try {
        const response = await fetch('/api/public/artisans');
        if (!response.ok) throw new Error('Impossible de charger les artisans');
        const data = await response.json();
        setHomeArtisans(data || []);
      } catch (error) {
        console.error('Erreur chargement artisans home:', error);
        setHomeArtisans([]);
      }
    };

    void loadArtisans();
  }, []);

  const filteredVendors = useMemo(() => {
    if (!searchVendor.trim()) return vendorList;
    return vendorList.filter((vendor) => vendor.name.toLowerCase().includes(searchVendor.toLowerCase()));
  }, [searchVendor]);

  const sortedArtisans = useMemo(() => {
    const query = jobType.toLowerCase();
    const candidates = homeArtisans.length > 0
      ? homeArtisans.filter((artisan) => {
          const haystack = `${artisan.companyName ?? ''} ${artisan.name ?? ''} ${artisan.city ?? ''}`.toLowerCase();
          return !query || haystack.includes(query) || query === 'artisan';
        })
      : [];

    return [...candidates].sort((a, b) => (b.certificationScore ?? 0) - (a.certificationScore ?? 0));
  }, [homeArtisans, jobType]);

  const currentAvatar = avatarSequence[avatarIndex];

  const handleQuickTarget = (target: "all" | "artisan" | "vendeur" | "promoteur") => {
    setQuickTarget(target);
    if (target === "all") {
      router.push("/devis/nouveau");
      return;
    }
    router.push(`/recherche?type=${target}`);
  };

  return (
    <div className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.9),_rgba(2,6,23,0.75))]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-sky-100 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-amber-300" />
                {dict.home.badge}
              </div>
            </div>

            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 opacity-80 blur-xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-white/10 text-4xl shadow-2xl backdrop-blur-sm">
                {currentAvatar.role === "Architecte" ? "🏛️" : currentAvatar.role === "Électricien" ? "⚡" : currentAvatar.role === "Conducteur de camion" ? "🚚" : "🧱"}
              </div>
            </div>

            <div className="mb-4 flex min-h-[72px] items-center justify-center">
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/90 shadow-lg backdrop-blur-sm transition-all duration-500">
                <span className="font-semibold text-white">{currentAvatar.role}</span>
                <span className="ml-2 text-sky-100">{currentAvatar.quote}</span>
              </div>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-7xl">
              {dict.home.headline}
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-200 sm:text-xl">
              {dict.home.subheadline}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center">
              <div className="w-full max-w-5xl rounded-[28px] border border-white/15 bg-white/5 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-sm sm:p-6">
                <div className="mb-5 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Envoyer un devis</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Contactez les bons profils en quelques clics</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Tous", value: "all", detail: "Tous profils" },
                    { label: "Artisan", value: "artisan", detail: "Plomberie, peinture..." },
                    { label: "Vendeur", value: "vendeur", detail: "Matériaux, équipement" },
                    { label: "Promoteur", value: "promoteur", detail: "Projets, commandes" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleQuickTarget(option.value as "all" | "artisan" | "vendeur" | "promoteur")}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        quickTarget === option.value
                          ? "border-sky-300 bg-sky-400/20 text-white shadow-lg shadow-sky-500/10"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-sky-200/60 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-sm font-bold">{option.label}</div>
                      <div className="mt-1 text-xs text-slate-300">{option.detail}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 w-full max-w-2xl">
                <SearchBar />
              </div>
              <p className="mt-3 text-sm text-slate-300/80">
                Recherchez par nom, ville ou spécialité. La recherche sert à filtrer les profils déjà sélectionnés.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">En un coup d&apos;œil</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Je gagne du temps, je réduis les erreurs et j&apos;avance plus sereinement.</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {insightCards.map((card) => (
            <article key={card.title} className="group rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 text-3xl shadow-inner">{card.icon}</div>
              <h3 className="text-2xl font-bold text-slate-900">{card.title}</h3>
              <p className="mt-4 text-base leading-7 text-slate-600">{card.body}</p>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{card.benefit}</div>
              <button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
                {card.action}
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Le parcours du particulier</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Je décris mon besoin</h2>
          </div>

          <div className="grid gap-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setNeedType("artisan")}
                  className={`rounded-2xl border px-5 py-4 text-left transition ${needType === "artisan" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5" />
                    <span className="font-bold">🔧 Je cherche un ARTISAN</span>
                  </div>
                </button>
                <button
                  onClick={() => setNeedType("materiel")}
                  className={`rounded-2xl border px-5 py-4 text-left transition ${needType === "materiel" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5" />
                    <span className="font-bold">🛒 Je cherche du MATÉRIEL</span>
                  </div>
                </button>
              </div>

              {needType === "artisan" ? (
                <div className="mt-6 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Métier recherché</label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none ring-0 focus:border-blue-500"
                    >
                      <option>Carreleur</option>
                      <option>Électricien</option>
                      <option>Plombier</option>
                      <option>Menuisier</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={materialProvidedByClient}
                      onChange={(e) => setMaterialProvidedByClient(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Cochez cette case si vous fournissez vous-même le matériel</span>
                  </label>

                  {!materialProvidedByClient ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      L&apos;IA inclura automatiquement les matériaux nécessaires dans la demande et les devis afficheront le coût des fournitures.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      L&apos;IA ne proposera que la main d&apos;œuvre. Les artisans affichés ne présenteront que le coût horaire ou forfait de prestation.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Search className="h-4 w-4 text-blue-600" />
                    Vous cherchez du matériel : l&apos;IA prépare une liste précise selon votre projet.
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    Exemple : 20 m² de carrelage, 5 sacs de colle, croisillons, joints, visserie, etc.
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5 rounded-[28px] bg-slate-900 p-5 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Vendeurs partenaires</p>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Vous connaissez déjà votre vendeur ? Recherchez-le ici"
                    value={searchVendor}
                    onChange={(e) => setSearchVendor(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredVendors.map((vendor) => (
                  <div key={vendor.name} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{vendor.name}</div>
                        <div className="mt-1 text-xs text-slate-400">{vendor.stock}</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-300">{vendor.price} €</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Filtre de budget intelligent</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">Budget défini : {budget.toLocaleString("fr-FR")} €</h3>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span>0 €</span>
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={100}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="h-2 w-full max-w-xs accent-blue-600"
                />
                <span>10 000 €</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {sortedArtisans.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  Aucun artisan trouvé pour ce secteur. Essayez un autre métier ou consultez tous les artisans.
                </div>
              ) : (
                sortedArtisans.slice(0, 4).map((artisan) => {
                  const score = artisan.certificationScore ?? 94;
                  const isWithinBudget = score >= 80;

                  return (
                    <div
                      key={artisan.id}
                      className={`rounded-2xl border p-4 ${isWithinBudget ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/80 opacity-90"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-slate-900">{artisan.companyName || artisan.name || 'Artisan'}</div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${isWithinBudget ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {isWithinBudget ? "dans budget" : "hors budget"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{artisan.city || 'Ville non renseignée'}</div>
                      <div className="mt-4 text-2xl font-black text-slate-900">{score}%</div>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700">
                        {artisan.certificationLabel || 'Expert certifié'}
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/client/${artisan.id}`)}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Voir le profil
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Technologies IA</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Des outils concrets qui accompagnent le métier, sans le remplacer.</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-8">
            <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 text-2xl">📷</div>
            <h3 className="text-2xl font-bold text-slate-900">Scan 3D & Imagerie</h3>
            <p className="mt-4 text-slate-600">Analysez rapidement les pièces, les surfaces, les défauts et les volumes pour préparer chantier, métré ou planification.</p>
          </div>
          <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-8">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 text-2xl">🧠</div>
            <h3 className="text-2xl font-bold text-slate-900">Analyse & Devis IA</h3>
            <p className="mt-4 text-slate-600">Calculez les besoins, évaluations, quantités et coûts à partir d&apos;images, de photos et de projets déjà existants.</p>
          </div>
          <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-8">
            <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3 text-2xl">💬</div>
            <h3 className="text-2xl font-bold text-slate-900">Conseil Virtuel</h3>
            <p className="mt-4 text-slate-600">Posez des questions à l&apos;IA, obtenez des recommandations et suivez les meilleures pratiques métier.</p>
          </div>
          <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-8">
            <div className="mb-4 inline-flex rounded-xl bg-violet-100 p-3 text-2xl">🎓</div>
            <h3 className="text-2xl font-bold text-slate-900">Tutoriels Interactifs</h3>
            <p className="mt-4 text-slate-600">Apprenez plus vite avec des modules de formation orientés sur les métiers du bâtiment et de la rénovation.</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Tarifs</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Choisissez la formule qui correspond à votre activité</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className={`rounded-[30px] border p-7 ${plan.accent}`}>
                <div className="text-sm font-semibold uppercase tracking-[0.14em] opacity-80">{plan.name}</div>
                <div className="mt-4 text-4xl font-black">{plan.price}</div>
                <div className="mt-2 text-sm opacity-80">{plan.subtitle}</div>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2">
                      <span className="text-lg">✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <button className="mt-8 w-full rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-900">Sélectionner</button>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Paiement sécurisé — Sans engagement.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Certification Aqil Bina</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Badge hybride : QCM + avis clients</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-amber-200 p-3 text-xl">🏅</div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Badge public</div>
                <div className="text-3xl font-black text-slate-900">Expert certifié</div>
              </div>
            </div>
            <div className="space-y-4 text-slate-700">
              <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3">
                <span>QCM technique</span>
                <span className="font-bold text-blue-700">100%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3">
                <span>Moyenne avis clients</span>
                <span className="font-bold text-emerald-700">4.9/5</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3">
                <span>Volume d&apos;avis</span>
                <span className="font-bold text-violet-700">15 avis</span>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-8">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              <h3 className="text-2xl font-bold text-slate-900">Règles de calcul du score</h3>
            </div>
            <p className="text-slate-600">Le score global = (QCM × 40%) + (avis clients × 40%) + (volume d&apos;avis × 20%).</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">QCM</div>
                <div className="mt-3 text-3xl font-black text-blue-700">40%</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Avis</div>
                <div className="mt-3 text-3xl font-black text-emerald-700">40%</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Volume</div>
                <div className="mt-3 text-3xl font-black text-violet-700">20%</div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-600" />Espace client : badge public visible sur la carte et le profil.</div>
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Espace artisan : score détaillé, jauges, actions et relance QCM.</div>
              <div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-blue-600" />Le score est recalculé dès qu&apos;un avis ou un QCM évolue.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[32px] bg-slate-900 p-8 text-white shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Contact</p>
              <h2 className="mt-3 text-3xl font-black">Dites-nous ce dont vous avez besoin.</h2>
              <p className="mt-4 text-slate-300">Notre équipe répond rapidement à toute demande, quel que soit votre profil.</p>
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-slate-800 p-3">WhatsApp : +33 6 12 34 56 78</div>
                <div className="rounded-2xl bg-slate-800 p-3">Téléphone : +33 1 84 00 00 00</div>
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
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <input type="email" placeholder="vous@exemple.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Objet</label>
                  <input type="text" placeholder="Demande de devis / besoin d&apos;aide" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-500" />
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
        </div>
      </section>
    </div>
  );
}
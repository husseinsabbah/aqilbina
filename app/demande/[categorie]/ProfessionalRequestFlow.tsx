'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProjectRequestForm from '@/app/client/[id]/ProjectRequestForm';

const specialtyOptions = {
  artisan: [
    ['carreleur', 'Carreleur'], ['plombier', 'Plombier'], ['electricien', 'Électricien'],
    ['peintre', 'Peintre'], ['menuisier', 'Menuisier'], ['maçon', 'Maçon'],
    ['couvreur', 'Couvreur'], ['terrassier', 'Terrassier'], ['renovation', 'Rénovation'],
  ],
  vendeur: [
    ['materiaux', 'Matériaux de construction'], ['sanitaire', 'Sanitaire'], ['quincaillerie', 'Quincaillerie'],
    ['menuiserie', 'Menuiserie'], ['isolation', 'Isolation'], ['outillage', 'Outillage'], ['decoration', 'Décoration'],
  ],
  promoteur: [
    ['promotion-immobiliere', 'Promotion immobilière'], ['gestion-chantier', 'Gestion de chantier'],
    ['maitrise-oeuvre', 'Maîtrise d’œuvre'], ['coordination-travaux', 'Coordination travaux'], ['amenagement', 'Aménagement'],
  ],
} as const;

type Professional = {
  id: string;
  name: string;
  companyName: string | null;
  city: string | null;
  trade: string | null;
  certificationScore: number | null;
};

const dynamicFields: Record<string, string[]> = {
  carreleur: ['Surface à carreler (m²)', 'Type de travaux', 'Photos du chantier'],
  electricien: ['Type d’intervention', 'Éléments concernés', 'Photos ou plans'],
  plombier: ['Type d’intervention', 'Équipement concerné', 'Niveau d’urgence'],
  peintre: ['Surface à peindre (m²)', 'Zone concernée', 'État du support'],
  menuisier: ['Équipement concerné', 'Type de travaux', 'Dimensions'],
};

export default function ProfessionalRequestFlow({ category, title }: { category: string; title: string }) {
  const options = specialtyOptions[category as keyof typeof specialtyOptions] ?? [];
  const [trade, setTrade] = useState(options[0]?.[0] ?? '');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedTradeLabel = (options as readonly (readonly [string, string])[]).find(([value]) => value === trade)?.[1] || trade;

  useEffect(() => {
    const loadProfessionals = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/public/professionals?role=${category}&trade=${encodeURIComponent(trade)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Impossible de charger les professionnels.');
        setProfessionals(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Erreur de chargement.');
        setProfessionals([]);
      } finally {
        setLoading(false);
      }
    };

    if (trade) void loadProfessionals();
  }, [category, trade]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Retour à l’accueil</Link>
        <header className="mt-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">Demande de devis</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-4 text-lg text-slate-600">Choisissez la spécialité pour voir les professionnels correspondants.</p>
        </header>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <label htmlFor="specialty" className="block text-sm font-bold text-slate-800">Spécialité recherchée</label>
          <select id="specialty" value={trade} onChange={(event) => setTrade(event.target.value)} className="mt-3 w-full max-w-xl rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600">
            {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4"><h2 className="text-2xl font-bold text-slate-950">Professionnels disponibles</h2><span className="text-sm text-slate-500">{professionals.length} résultat{professionals.length > 1 ? 's' : ''}</span></div>
          {loading && <p className="mt-5 text-slate-600">Recherche en cours...</p>}
          {error && <p className="mt-5 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
          {!loading && !error && professionals.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">Aucun professionnel trouvé pour cette spécialité.</p>}
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {professionals.map((professional) => (
              <Link key={professional.id} href={`/client/${professional.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">{trade}</p>
                <h3 className="mt-2 text-xl font-bold text-slate-950">{professional.companyName || professional.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{professional.city || 'Ville non renseignée'}</p>
                <p className="mt-4 text-sm font-semibold text-emerald-700">Certification : {professional.certificationScore ?? 0}%</p>
                <span className="mt-5 inline-block text-sm font-bold text-blue-700">Voir le profil et demander un devis →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-xl font-bold text-slate-950">Demande de devis pour {selectedTradeLabel}</h2>
          <p className="mt-2 text-sm text-slate-600">Vous pouvez choisir un professionnel ci-dessus ou envoyer la même demande à tous les professionnels de cette spécialité.</p>
          {professionals.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white p-4 sm:p-6">
              <ProjectRequestForm
                artisanId={professionals[0].id}
                artisanName={`tous les professionnels ${selectedTradeLabel}`}
                trade={trade}
                broadcastMode
                defaultValues={{
                  clientName: '',
                  clientPhone: '',
                  clientEmail: '',
                  clientAddress: '',
                  projectName: `Demande de devis - ${selectedTradeLabel}`,
                  projectType: dynamicFields[trade]?.[1] || 'Demande de prestation',
                  customProjectType: '',
                  workType: '',
                  description: '',
                  solLongueur: '',
                  solLargeur: '',
                  solSurface: '',
                  murLongueur: '',
                  murHauteur: '',
                  nbMurs: '',
                  murSurface: '',
                  surface: '',
                  budgetEstimate: '',
                  specialtyDetails: '',
                }}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

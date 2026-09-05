"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

type Artisan = {
  id: string;
  name: string | null;
  companyName: string | null;
  city: string | null;
  certificationScore?: number;
  certificationLabel?: string;
  certificationBadge?: string;
};

function ArtisansContent() {
  const searchParams = useSearchParams();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArtisans = async () => {
      try {
        const res = await fetch('/api/public/artisans');
        if (!res.ok) throw new Error('Impossible de charger les artisans');
        const data = await res.json();
        setArtisans(data || []);
      } catch (error) {
        console.error(error);
        setArtisans([]);
      } finally {
        setLoading(false);
      }
    };

    loadArtisans();
  }, []);

  const filteredArtisans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artisans;

    return artisans.filter((artisan) => {
      const candidate = `${artisan.name ?? ''} ${artisan.companyName ?? ''} ${artisan.city ?? ''}`.toLowerCase();
      return candidate.includes(q);
    });
  }, [artisans, search]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Aqil Bina</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Artisans</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un artisan ou une ville"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            Chargement des artisans...
          </div>
        ) : filteredArtisans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm">
            Aucun artisan ne correspond à cette recherche.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredArtisans.map((artisan) => (
              <Link
                key={artisan.id}
                href={`/client/${artisan.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {artisan.companyName?.charAt(0)?.toUpperCase() || artisan.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {artisan.companyName || artisan.name || 'Artisan'}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {artisan.name && artisan.companyName && artisan.name !== artisan.companyName ? artisan.name : 'Artisan confirmé'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{artisan.city || 'Ville non renseignée'}</p>
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${artisan.certificationBadge || 'border-emerald-200 bg-emerald-100 text-emerald-700'}`}>
                    {artisan.certificationLabel || 'Expert certifié'}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span>Score AQIL</span>
                  <span className="font-bold text-slate-900">{artisan.certificationScore ?? 94}%</span>
                </div>
                <div className="mt-5 inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  Voir le catalogue →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function ArtisansPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-600">Chargement...</div>}>
      <ArtisansContent />
    </Suspense>
  );
}

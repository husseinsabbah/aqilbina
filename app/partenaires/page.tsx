"use client";

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Building2, ShieldCheck, XCircle, CheckCircle2, Send, Sparkles, MapPin, Search, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const reasons = [
  'Manque de confiance',
  'Désaccord commercial',
  'Rupture de communication',
  'Problèmes de qualité',
  'Autre',
];

const roleLabels: Record<string, string> = {
  artisan: 'Artisan',
  vendeur: 'Vendeur',
  promoteur: 'Promoteur',
};

type PartnerUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  trade?: string | null;
  companyName?: string | null;
  city?: string | null;
};

type Partnership = {
  id: string;
  status: string;
  targetRole: string;
  cancellationReasons?: string | null;
  cancellationDetails?: string | null;
  evaluationStatus?: string | null;
  initiator: PartnerUser;
  targetUser: PartnerUser;
  reviewedByAdmin?: PartnerUser | null;
  createdAt: string;
};

function PartenairesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [role, setRole] = useState<string>('artisan');
  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [cancelReasonInputs, setCancelReasonInputs] = useState<Record<string, string[]>>({});
  const [cancelDetails, setCancelDetails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    const requestedRole = searchParams.get('role') || 'artisan';
    setRole(requestedRole);
  }, [searchParams, session, status, router]);

  useEffect(() => {
    if (!session) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/partnerships?role=${encodeURIComponent(role)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Erreur');
        const data = await res.json();
        setUsers(Array.isArray(data.candidates) ? data.candidates : []);
        setPartnerships(Array.isArray(data.partnerships) ? data.partnerships : []);
      } catch (error) {
        console.error('Erreur chargement partenariats', error);
      } finally {
        setLoading(false);
      }
    };

    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [session, role]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users
      .filter((user) => user.id !== session?.user?.id)
      .filter((user) => {
        const matchesSearch = !normalizedSearch || [user.name, user.email, user.companyName, user.trade, user.role, user.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

        const matchesCity = !cityFilter || (user.city || '').toLowerCase().includes(cityFilter.trim().toLowerCase());

        return matchesSearch && matchesCity;
      })
      .sort((a, b) => {
        const aMatchesRole = a.role === role || a.trade === role ? 0 : 1;
        const bMatchesRole = b.role === role || b.trade === role ? 0 : 1;
        if (aMatchesRole !== bMatchesRole) return aMatchesRole - bMatchesRole;

        const aCategory = (a.trade || a.role || '').toLowerCase();
        const bCategory = (b.trade || b.role || '').toLowerCase();
        return aCategory.localeCompare(bCategory);
      });
  }, [users, session, role, searchTerm, cityFilter]);

  const createPartnershipForUser = async (userId: string) => {
    if (!userId) return;

    try {
      const res = await fetch('/api/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: userId, targetRole: role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      setSelectedUserId('');
      const refreshed = await fetch(`/api/partnerships?role=${encodeURIComponent(role)}`, { credentials: 'include' });
      if (refreshed.ok) {
        const payload = await refreshed.json();
        setPartnerships(Array.isArray(payload.partnerships) ? payload.partnerships : []);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de la demande');
    }
  };

  const respondToPartnership = async (partnershipId: string, decision: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/partnerships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ partnershipId, action: 'respond', decision }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      setPartnerships((prev) => prev.map((row) => {
        if (row.id !== partnershipId) return row;
        const nextStatus = decision === 'accept' ? 'ACTIVE' : 'REJECTED';
        const nextEvaluationStatus = decision === 'accept' ? 'VALIDATED' : 'REJECTED';

        return {
          ...row,
          status: nextStatus,
          evaluationStatus: nextEvaluationStatus,
        };
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de la réponse à la demande');
    }
  };

  const cancelPartnership = async (partnershipId: string) => {
    const selectedReasons = cancelReasonInputs[partnershipId] || [];
    const details = cancelDetails[partnershipId] || '';

    try {
      const res = await fetch('/api/partnerships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ partnershipId, action: 'cancel', reasons: selectedReasons, details }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      setPartnerships((prev) => prev.map((row) => row.id === partnershipId ? { ...row, status: 'CANCELLED', cancellationReasons: selectedReasons.join(', '), cancellationDetails: details } : row));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l’annulation');
    }
  };

  const toggleReason = (partnershipId: string, reason: string) => {
    setCancelReasonInputs((prev) => {
      const prevValue = prev[partnershipId] || [];
      const next = prevValue.includes(reason)
        ? prevValue.filter((item) => item !== reason)
        : [...prevValue, reason];
      return { ...prev, [partnershipId]: next };
    });
  };

  const currentLabel = roleLabels[role] || 'Partenaire';

  if (status === 'loading' || !session) return null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Sidebar />
      <main className="ml-64 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Relations</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Partenaires</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              <Sparkles className="h-4 w-4" />
              Partenariats durables
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {['artisan', 'vendeur', 'promoteur'].map((tab) => (
              <button
                key={tab}
                onClick={() => router.push(`/partenaires?role=${tab}`)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${role === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {roleLabels[tab]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Search className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-semibold text-slate-900">Rechercher un partenaire</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Mot-clé</label>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom, entreprise, spécialité, produit..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Région / ville</label>
                <input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Ex: Lyon, Paris..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              Propositions prioritaires
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {filteredUsers.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  Aucun profil ne correspond à votre recherche pour le moment.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-violet-50 to-sky-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{user.role}</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">{user.companyName || user.name || 'Profil'}</h3>
                      </div>
                      <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase text-slate-700">
                        {user.trade || 'Général'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p className="font-medium text-slate-700">{user.name || user.email}</p>
                      {user.city && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-rose-500" />
                          {user.city}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link
                        href={`/client/${user.id}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
                      >
                        Envoyer la demande de devis
                      </Link>
                      <button
                        onClick={() => createPartnershipForUser(user.id)}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Demander le partenariat
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-semibold text-slate-900">Créer une relation de partenariat</h2>
              </div>

              <div className="space-y-4">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionner un profil {currentLabel.toLowerCase()}</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} · {user.companyName || user.trade || user.role}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => createPartnershipForUser(selectedUserId)}
                  disabled={!selectedUserId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Demander le partenariat
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900">Validation admin</h2>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <p>Les demandes de partenariat sont envoyées au système d’évaluation.</p>
                <p>Après validation par l’admin, le partenariat devient actif et visible dans le réseau.</p>
                <p className="rounded-xl bg-emerald-50 p-3 text-emerald-700">Status prévu : PENDING → VALIDATED / REJECTED par l’admin.</p>
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-semibold text-slate-900">Mes partenariats</h2>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Chargement…</div>
          ) : partnerships.length === 0 ? (
            <div className="text-sm text-slate-500">Aucun partenariat pour ce profil.</div>
          ) : (
            <div className="space-y-4">
              {partnerships.map((partnership) => {
                const relatedUser = partnership.initiator.id === session.user.id ? partnership.targetUser : partnership.initiator;
                const isCancelled = partnership.status === 'CANCELLED';
                const isPendingForTarget = partnership.targetUser.id === session.user.id && partnership.status === 'PENDING';
                return (
                  <div key={partnership.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{relatedUser.name || relatedUser.email}</h3>
                        <p className="text-sm text-slate-600">{relatedUser.companyName || relatedUser.trade || relatedUser.role}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className={`rounded-full px-2 py-1 ${partnership.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : partnership.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : partnership.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {partnership.status}
                        </span>
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">
                          {partnership.evaluationStatus || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    {isPendingForTarget && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Demande en attente de validation
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => respondToPartnership(partnership.id, 'accept')}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                          >
                            Valider la demande
                          </button>
                          <button
                            onClick={() => respondToPartnership(partnership.id, 'reject')}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                          >
                            Rejeter la demande
                          </button>
                        </div>
                      </div>
                    )}

                    {!isCancelled ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
                          <XCircle className="h-4 w-4" />
                          Annulation du partenariat
                        </div>

                        <div className="space-y-2">
                          {reasons.map((reason) => (
                            <label key={reason} className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={(cancelReasonInputs[partnership.id] || []).includes(reason)}
                                onChange={() => toggleReason(partnership.id, reason)}
                                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                              />
                              {reason}
                            </label>
                          ))}
                        </div>

                        <textarea
                          value={cancelDetails[partnership.id] || ''}
                          onChange={(e) => setCancelDetails((prev) => ({ ...prev, [partnership.id]: e.target.value }))}
                          placeholder="Précisez la raison détaillée…"
                          className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
                          rows={3}
                        />

                        <button
                          onClick={() => cancelPartnership(partnership.id)}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                          <Send className="h-4 w-4" />
                          Envoyer l’annulation
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        <p className="font-medium text-slate-800">Motif d’annulation :</p>
                        <p>{partnership.cancellationReasons || 'Aucun motif renseigné'}</p>
                        {partnership.cancellationDetails && (
                          <p className="mt-2 text-slate-700">{partnership.cancellationDetails}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      </main>
    </div>
  );
}

export default function PartenairesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 p-6 text-slate-600">Chargement des partenariats…</div>}>
      <PartenairesPageContent />
    </Suspense>
  );
}

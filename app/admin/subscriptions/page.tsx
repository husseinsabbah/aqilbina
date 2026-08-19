'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Subscription = {
  id: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  trialEndDate?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    companyName?: string | null;
  };
  agent: {
    id: string;
    name: string;
    type: string;
    specialty?: string | null;
  };
};

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    void loadSubscriptions();
  }, [session, status, router]);

  const loadSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erreur lors du chargement des abonnements');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (userAgentId: string, nextStatus: string) => {
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userAgentId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Mise à jour impossible');
      await loadSubscriptions();
      alert('Statut mis à jour');
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (status === 'loading' || !session) {
    return <div className="p-8 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Administration</p>
            <h1 className="text-3xl font-bold">Abonnements</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Retour admin
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Gestion des abonnements</h2>

          {loading ? (
            <p className="text-slate-500">Chargement...</p>
          ) : subscriptions.length === 0 ? (
            <p className="text-slate-500">Aucun abonnement trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Début</th>
                    <th className="px-4 py-3">Fin</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <div className="font-medium">{subscription.user.name}</div>
                        <div className="text-xs text-slate-500">{subscription.user.email}</div>
                        {subscription.user.companyName && (
                          <div className="text-xs text-slate-500">{subscription.user.companyName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{subscription.agent.name}</div>
                        <div className="text-xs text-slate-500">{subscription.agent.type} · {subscription.agent.specialty || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(subscription.startDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={subscription.status}
                          onChange={(e) => updateStatus(subscription.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="TRIAL">TRIAL</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="EXPIRED">EXPIRED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

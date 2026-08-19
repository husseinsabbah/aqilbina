'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Agent = {
  id: string;
  name: string;
  type: string;
  specialty?: string | null;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userAgents?: Array<{ id: string; status: string; userId: string }>;
};

const emptyForm = {
  name: '',
  type: 'vendeur',
  specialty: '',
  description: '',
  priceMonthly: '0',
  priceYearly: '0',
  isActive: true,
};

export default function AdminAgentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    void loadAgents();
  }, [session, status, router]);

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/admin/agents', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Erreur de chargement');
      }
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId ? `/api/admin/agents/${editingId}` : '/api/admin/agents';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          priceMonthly: Number(form.priceMonthly),
          priceYearly: Number(form.priceYearly),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erreur lors de la sauvegarde');
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadAgents();
      alert(editingId ? 'Agent mis à jour' : 'Agent créé');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setForm({
      name: agent.name,
      type: agent.type,
      specialty: agent.specialty || '',
      description: agent.description || '',
      priceMonthly: String(agent.priceMonthly),
      priceYearly: String(agent.priceYearly),
      isActive: agent.isActive,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet agent ?')) return;

    try {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Suppression impossible');
      await loadAgents();
      alert('Agent supprimé');
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
            <h1 className="text-3xl font-bold">Agents IA</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Retour admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{editingId ? 'Modifier l’agent' : 'Créer un agent'}</h2>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Annuler
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom"
              className="rounded-lg border border-slate-200 px-3 py-2"
              required
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="vendeur">vendeur</option>
              <option value="artisan">artisan</option>
              <option value="societe">societe</option>
              <option value="sur-mesure">sur-mesure</option>
            </select>
            <input
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="Spécialité"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <span>Actif</span>
            </div>
            <input
              type="number"
              min="0"
              value={form.priceMonthly}
              onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
              placeholder="Prix mensuel"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <input
              type="number"
              min="0"
              value={form.priceYearly}
              onChange={(e) => setForm({ ...form, priceYearly: e.target.value })}
              placeholder="Prix annuel"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="md:col-span-2 min-h-[100px] rounded-lg border border-slate-200 px-3 py-2"
            />
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Liste des agents</h2>

          {loading ? (
            <p className="text-slate-500">Chargement...</p>
          ) : agents.length === 0 ? (
            <p className="text-slate-500">Aucun agent pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Spécialité</th>
                    <th className="px-4 py-3">Prix</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Abonnés</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium">{agent.name}</td>
                      <td className="px-4 py-3">{agent.type}</td>
                      <td className="px-4 py-3">{agent.specialty || '-'}</td>
                      <td className="px-4 py-3">{agent.priceMonthly}€ / {agent.priceYearly}€</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${agent.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          {agent.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{agent.userAgents?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(agent)}
                            className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(agent.id)}
                            className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                          >
                            Supprimer
                          </button>
                        </div>
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

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Tutorial = {
  id: string;
  title: string;
  type: string;
  url?: string | null;
  description?: string | null;
  trade?: string | null;
  source?: string | null;
  tags?: string | null;
  keywords: string;
  createdAt: string;
};

const emptyForm = {
  title: '',
  type: 'video',
  url: '',
  description: '',
  trade: '',
  source: '',
  tags: '',
  keywords: '',
};

export default function AdminTutorialsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
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

    void loadTutorials();
  }, [session, status, router]);

  const loadTutorials = async () => {
    try {
      const res = await fetch('/api/admin/tutorials', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
      setTutorials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erreur lors du chargement des tutoriels');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId ? `/api/admin/tutorials/${editingId}` : '/api/admin/tutorials';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur lors de la sauvegarde');

      setForm(emptyForm);
      setEditingId(null);
      await loadTutorials();
      alert(editingId ? 'Tutoriel mis à jour' : 'Tutoriel créé');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingId(tutorial.id);
    setForm({
      title: tutorial.title,
      type: tutorial.type,
      url: tutorial.url || '',
      description: tutorial.description || '',
      trade: tutorial.trade || '',
      source: tutorial.source || '',
      tags: tutorial.tags || '',
      keywords: tutorial.keywords || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce tutoriel ?')) return;

    try {
      const res = await fetch(`/api/admin/tutorials/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Suppression impossible');
      await loadTutorials();
      alert('Tutoriel supprimé');
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
            <h1 className="text-3xl font-bold">Tutoriels</h1>
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
            <h2 className="text-xl font-semibold">{editingId ? 'Modifier le tutoriel' : 'Ajouter un tutoriel'}</h2>
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
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Titre"
              className="rounded-lg border border-slate-200 px-3 py-2"
              required
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="video">video</option>
              <option value="text">text</option>
              <option value="link">link</option>
            </select>
            <input
              value={form.trade}
              onChange={(e) => setForm({ ...form, trade: e.target.value })}
              placeholder="Métier concerné"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Source"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="URL"
              className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="md:col-span-2 min-h-[100px] rounded-lg border border-slate-200 px-3 py-2"
            />
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Tags"
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
            <input
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="Mots-clés"
              className="rounded-lg border border-slate-200 px-3 py-2"
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
          <h2 className="mb-4 text-xl font-semibold">Tutoriels enregistrés</h2>

          {loading ? (
            <p className="text-slate-500">Chargement...</p>
          ) : tutorials.length === 0 ? (
            <p className="text-slate-500">Aucun tutoriel.</p>
          ) : (
            <div className="space-y-4">
              {tutorials.map((tutorial) => (
                <div key={tutorial.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{tutorial.title}</h3>
                      <p className="text-xs text-slate-500">
                        {tutorial.type} · {tutorial.trade || 'Non défini'} · {tutorial.source || 'source inconnue'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(tutorial)}
                        className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(tutorial.id)}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {tutorial.description && <p className="mt-2 text-sm text-slate-600">{tutorial.description}</p>}
                  {tutorial.url && (
                    <a href={tutorial.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-700 underline">
                      Ouvrir le lien
                    </a>
                  )}
                  {tutorial.tags && <p className="mt-2 text-xs text-slate-500">Tags : {tutorial.tags}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShieldCheck, Users, FolderKanban, Sparkles, ArrowRight, Plus, UserCog, FileText } from 'lucide-react';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  trade?: string | null;
  companyName?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  details?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  adminUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  targetUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!session || session.user.role !== 'admin') return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [usersRes, auditRes] = await Promise.all([
          fetch('/api/admin/users', { credentials: 'include' }),
          fetch('/api/admin/audit', { credentials: 'include' }),
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(Array.isArray(usersData) ? usersData : []);
        }

        if (auditRes.ok) {
          const logsData = await auditRes.json();
          setAuditLogs(Array.isArray(logsData) ? logsData : []);
        }
      } catch (error) {
        console.error('Erreur chargement admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [session]);

  const handleRoleChange = async (userId: string, nextRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, role: nextRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de rôle');

      setUsers((prev) => prev.map((user) => user.id === userId ? { ...user, role: nextRole } : user));
      alert('✅ Rôle mis à jour');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newAdmin),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur création admin');

      setNewAdmin({ name: '', email: '', password: '', role: 'admin' });
      const refreshed = await fetch('/api/admin/users', { credentials: 'include' });
      if (refreshed.ok) {
        const usersData = await refreshed.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
      alert('✅ Admin ajouté');
    } catch (error) {
      alert('Erreur : ' + (error as Error).message);
    }
  };

  if (status === 'loading' || !session || session.user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          Vérification des droits d’administration...
        </div>
      </div>
    );
  }

  const adminCards = [
    {
      title: 'Utilisateurs',
      value: `${users.length} comptes`,
      icon: Users,
      href: '/parametres',
    },
    {
      title: 'Projets',
      value: 'Suivi des projets',
      icon: FolderKanban,
      href: '/dashboard',
    },
    {
      title: 'IA',
      value: 'Configuration assistant',
      icon: Sparkles,
      href: '/parametres',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Administration</p>
              <h1 className="text-2xl font-bold text-slate-900">Tableau de bord admin</h1>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Retour au dashboard
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {adminCards.map(({ title, value, icon: Icon, href }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500">{title}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{value}</h2>
              <button
                onClick={() => router.push(href)}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                Ouvrir
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <UserCog className="h-5 w-5 text-blue-700" />
              <h2 className="text-lg font-semibold text-slate-900">Ajouter un administrateur</h2>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <input
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                placeholder="Nom"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                required
              />
              <input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                placeholder="Email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                required
              />
              <input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                placeholder="Mot de passe provisoire"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                required
              />
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-700" />
              <h2 className="text-lg font-semibold text-slate-900">Rapports d’activité</h2>
            </div>

            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune activité enregistrée.</p>
              ) : (
                auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-slate-800">{log.action}</strong>
                      <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {log.adminUser ? `Admin: ${log.adminUser.name} (${log.adminUser.email})` : 'Admin inconnu'}
                    </p>
                    {log.details && <p className="mt-1 text-xs text-slate-600">{log.details}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Gestion des comptes</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Rôle</th>
                    <th className="px-3 py-2">Entreprise</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="px-3 py-3">{user.name}</td>
                      <td className="px-3 py-3">{user.email}</td>
                      <td className="px-3 py-3">{user.role}</td>
                      <td className="px-3 py-3">{user.companyName || user.trade || '-'}</td>
                      <td className="px-3 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
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

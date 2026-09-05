'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type AssistantLog = {
  id: string;
  action: string;
  status: string;
  durationMs: number;
  error?: string | null;
  createdAt: string;
  agent?: {
    id: string;
    name: string;
    type: string;
    specialty?: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type AdminLog = {
  id: string;
  action: string;
  details?: string | null;
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

export default function AdminLogsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [assistantLogs, setAssistantLogs] = useState<AssistantLog[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
      setAssistantLogs(Array.isArray(data.assistantLogs) ? data.assistantLogs : []);
      setAdminLogs(Array.isArray(data.adminLogs) ? data.adminLogs : []);
    } catch (error) {
      console.error(error);
      alert('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

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

    void loadLogs();
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return <div className="p-8 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Administration</p>
            <h1 className="text-3xl font-bold">Monitoring & logs</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Retour admin
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Chargement...</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Logs IA</h2>
              <div className="space-y-3">
                {assistantLogs.length === 0 ? (
                  <p className="text-slate-500">Aucun log IA.</p>
                ) : (
                  assistantLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{log.action}</div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${log.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {log.agent?.name || 'Agent inconnu'} · {log.user?.name || 'Utilisateur inconnu'} · {log.durationMs} ms
                      </div>
                      {log.error && <div className="mt-2 text-xs text-red-600">Erreur : {log.error}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Audit admin</h2>
              <div className="space-y-3">
                {adminLogs.length === 0 ? (
                  <p className="text-slate-500">Aucun log d’audit.</p>
                ) : (
                  adminLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="font-medium">{log.action}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {log.adminUser?.name || 'Admin inconnu'} · {log.targetUser?.name || 'Cible inconnue'}
                      </div>
                      {log.details && <div className="mt-2 text-sm text-slate-600">{log.details}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

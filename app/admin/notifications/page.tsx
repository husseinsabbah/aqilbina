'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

    void loadNotifications();
  }, [session, status, router]);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      await loadNotifications();
      alert('Notifications marquées comme lues');
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (status === 'loading' || !session) {
    return <div className="p-8 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Administration</p>
            <h1 className="text-3xl font-bold">Notifications</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllRead}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              Tout marquer lu
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Retour admin
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-slate-500">Chargement...</p>
          ) : notifications.length === 0 ? (
            <p className="text-slate-500">Aucune notification.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className={`rounded-xl border p-4 ${notification.read ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{notification.title}</div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{notification.type}</div>
                    </div>
                    {!notification.read && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">Nouveau</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                  <div className="mt-2 text-xs text-slate-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

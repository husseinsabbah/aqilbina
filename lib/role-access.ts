import { Session } from 'next-auth';

export type AppRole = 'admin' | 'artisan' | 'vendeur' | 'user';

export function normalizeRole(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function hasRole(session: Session | null | undefined, role: AppRole): boolean {
  const user = session?.user;
  if (!user) return false;

  const normalizedRole = normalizeRole(user.role);
  const normalizedTrade = normalizeRole((user as { trade?: string | null }).trade);
  return normalizedRole === role || normalizedTrade === role;
}

export function isAdmin(session: Session | null | undefined): boolean {
  return hasRole(session, 'admin');
}

export function isArtisan(session: Session | null | undefined): boolean {
  return hasRole(session, 'artisan');
}

export function isSeller(session: Session | null | undefined): boolean {
  return hasRole(session, 'vendeur');
}

export function requireSession(session: Session | null | undefined) {
  if (!session?.user?.id) {
    return { ok: false as const, error: 'Non authentifié', status: 401 };
  }

  return { ok: true as const, user: session.user };
}

export function requireRole(session: Session | null | undefined, allowedRoles: AppRole[], message: string) {
  const auth = requireSession(session);
  if (!auth.ok) {
    return auth;
  }

  const hasAccess = allowedRoles.some((role) => hasRole(session, role));
  if (!hasAccess) {
    return { ok: false as const, error: message, status: 403 };
  }

  return { ok: true as const, user: auth.user };
}

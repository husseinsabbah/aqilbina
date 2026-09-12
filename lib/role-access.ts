import { Session } from 'next-auth';

export type AppRole =
  | 'admin'
  | 'artisan'
  | 'vendeur'
  | 'user'
  | 'superviseur'
  | 'responsable_catalogue'
  | 'responsable_categorie'
  | 'equipe_categorie'
  | 'collaborateur';

export const ADMIN_MANAGED_ROLES: AppRole[] = [
  'user',
  'admin',
  'superviseur',
  'responsable_catalogue',
  'responsable_categorie',
  'equipe_categorie',
  'collaborateur',
];

export const CATALOG_MANAGEMENT_ROLES: AppRole[] = [
  'admin',
  'artisan',
  'vendeur',
  'superviseur',
  'responsable_catalogue',
  'responsable_categorie',
  'equipe_categorie',
  'collaborateur',
];

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

export function hasAnyRole(session: Session | null | undefined, roles: AppRole[]): boolean {
  return roles.some((role) => hasRole(session, role));
}

export function isAdmin(session: Session | null | undefined): boolean {
  return hasAnyRole(session, ['admin']);
}

export function isArtisan(session: Session | null | undefined): boolean {
  return hasAnyRole(session, ['artisan']);
}

export function isSeller(session: Session | null | undefined): boolean {
  return hasAnyRole(session, ['vendeur']);
}

export function isSupervisor(session: Session | null | undefined): boolean {
  return hasAnyRole(session, ['superviseur']);
}

export function hasCatalogManagementRole(session: Session | null | undefined): boolean {
  return hasAnyRole(session, CATALOG_MANAGEMENT_ROLES);
}

export function canManageCatalog(session: Session | null | undefined, ownerUserId?: string | null): boolean {
  if (!session?.user?.id) {
    return false;
  }

  if (isAdmin(session)) {
    return true;
  }

  if (ownerUserId && session.user.id === ownerUserId) {
    return true;
  }

  return hasCatalogManagementRole(session) && !!ownerUserId && session.user.id === ownerUserId;
}

export function validateCatalogProductCompatibility(catalogName: string, category: string) {
  const catalogText = normalizeRole(catalogName);
  const categoryText = normalizeRole(category);

  if (!catalogText || !categoryText) {
    return { ok: true };
  }

  const catalogRules = [
    {
      catalogKeywords: ['electric', 'electrique', 'elec', 'cablage', 'prise', 'tableau', 'installation electrique', 'electrical'],
      blockedKeywords: ['plomberie', 'sanitaire', 'evacuation', 'canalisation', 'chauffe-eau', 'chauffe_eau', 'salle de bain', 'toilette'],
      message: 'Le catalogue électrique ne peut pas contenir des produits de plomberie ou de sanitaire.',
    },
    {
      catalogKeywords: ['plomb', 'plomberie', 'sanitaire', 'chauffe-eau', 'chauffe_eau', 'canalisation', 'evacuation'],
      blockedKeywords: ['electrique', 'electricite', 'cablage', 'prise', 'tableau', 'circuit'],
      message: 'Le catalogue plomberie ne peut pas contenir des produits électriques.',
    },
    {
      catalogKeywords: ['jardin', 'paysage', 'exterieur', 'extérieur', 'cloture', 'clôture'],
      blockedKeywords: ['electrique', 'plomberie', 'sanitaire'],
      message: 'Le catalogue jardin ne peut pas contenir des produits électriques ou de plomberie.',
    },
    {
      catalogKeywords: ['peint', 'peinture', 'finition', 'revêtement', 'revetement'],
      blockedKeywords: ['electrique', 'plomberie', 'sanitaire', 'cablage'],
      message: 'Le catalogue peinture ne peut pas contenir des produits électriques ou de plomberie.',
    },
  ];

  for (const rule of catalogRules) {
    const matchesCatalog = rule.catalogKeywords.some((keyword) => catalogText.includes(keyword));
    if (!matchesCatalog) continue;

    const isBlocked = rule.blockedKeywords.some((keyword) => categoryText.includes(keyword));
    if (isBlocked) {
      return { ok: false, message: rule.message };
    }
  }

  return { ok: true };
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

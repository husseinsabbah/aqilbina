// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';



export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const path = req.nextUrl.pathname;

  // Vérifier si la route est protégée
  if (path.startsWith('/artisan') || path.startsWith('/vendeur')) {
    // 1. L'utilisateur doit être connecté
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // 2. L'utilisateur doit avoir le bon rôle
    if (path.startsWith('/artisan') && token.trade !== 'artisan') {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    if (path.startsWith('/vendeur') && token.trade !== 'vendeur') {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
  }

  return NextResponse.next();
}

// Configurer les chemins sur lesquels le middleware s'exécute
export const config = {
  matcher: ['/artisan/:path*', '/vendeur/:path*'],
};
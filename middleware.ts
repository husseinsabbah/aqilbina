// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';



export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const path = req.nextUrl.pathname;
  const userRole = String(token?.role ?? token?.trade ?? '').toLowerCase();

  if (path.startsWith('/artisan') || path.startsWith('/vendeur')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (path.startsWith('/artisan') && userRole !== 'artisan') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (path.startsWith('/vendeur') && userRole !== 'vendeur') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

// Configurer les chemins sur lesquels le middleware s'exécute
export const config = {
  matcher: ['/artisan/:path*', '/vendeur/:path*'],
};
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const getCertificationState = (score: number) => {
  if (score >= 85) return { label: 'Expert certifié', score, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (score >= 70) return { label: 'Professionnel certifié', score, badge: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (score >= 50) return { label: 'Certificat en cours', score, badge: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'À renforcer', score, badge: 'bg-rose-100 text-rose-700 border-rose-200' };
};

export async function GET() {
  try {
    const artisans = await prisma.user.findMany({
      where: { trade: 'artisan' },
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
        phone: true,
        certificationScore: true,
        certificationLabel: true,
        projects: {
          select: {
            portfolioRating: true,
          },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const enriched = artisans.map((artisan) => {
      const portfolioRatings = artisan.projects
        .map((project) => project.portfolioRating)
        .filter((rating): rating is number => typeof rating === 'number' && rating > 0);

      const averageRating = portfolioRatings.length > 0
        ? portfolioRatings.reduce((sum, rating) => sum + rating, 0) / portfolioRatings.length
        : 4.9;

      const scoreFromReviews = Math.round((averageRating / 5) * 100);
      const score = typeof artisan.certificationScore === 'number' && artisan.certificationScore > 0
        ? artisan.certificationScore
        : Math.min(99, Math.max(50, scoreFromReviews));
      const certification = getCertificationState(score);

      return {
        id: artisan.id,
        name: artisan.name,
        companyName: artisan.companyName,
        city: artisan.city,
        phone: artisan.phone,
        certificationScore: score,
        certificationLabel: artisan.certificationLabel || certification.label,
        certificationBadge: certification.badge,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/artisans error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

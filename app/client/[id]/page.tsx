import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';
import ProjectRequestForm from './ProjectRequestForm';

const TRADE_KEYWORDS: Record<string, string[]> = {
  carreleur: ['carrelage', 'carreau', 'faience', 'faïence', 'joint', 'colle'],
  plombier: ['plomberie', 'sanitaire', 'douche', 'lavabo', 'chauffage', 'canalisation'],
  electricien: ['electricite', 'électricité', 'eclairage', 'éclairage', 'prise', 'tableau', 'domotique'],
  peintre: ['peinture', 'enduit', 'facade', 'façade', 'vernis'],
  menuisier: ['menuiserie', 'bois', 'fenetre', 'fenêtre', 'porte', 'placard'],
  macon: ['maconnerie', 'maçonnerie', 'parpaing', 'beton', 'béton', 'fondation'],
};

const detectTradeFromText = (value: string): string | null => {
  const normalized = value.toLowerCase();

  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return trade;
    }
  }

  return null;
};

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const connectedUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      })
    : null;

  const artisan = await prisma.user.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { name: 'asc' },
      },
      services: {
        orderBy: { name: 'asc' },
      },
      projects: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const isArtisanProfile = artisan && (artisan.role === 'artisan' || artisan.trade === 'artisan');

  if (!artisan || !isArtisanProfile) {
    notFound();
  }

  const projectCounts = artisan.projects.reduce(
    (acc, project) => {
      const status = String(project.status || '').trim().toUpperCase();

      if (['TERMINE', 'TERMINEE', 'ACCEPTE', 'ACCEPTED', 'FINI', 'FINALISE', 'FINALISÉ'].includes(status)) {
        acc.finalized += 1;
      } else if (['EN_COURS', 'EN COURS', 'IN_PROGRESS', 'PROGRESS'].includes(status)) {
        acc.inProgress += 1;
      } else if (['EN_ATTENTE', 'PENDING', 'BROUILLON', 'PUBLIE'].includes(status)) {
        acc.pending += 1;
      }

      return acc;
    },
    { finalized: 0, inProgress: 0, pending: 0 }
  );

  const projectMetrics = [
    { label: 'Projets finalisés', value: projectCounts.finalized, tone: 'emerald' },
    { label: 'Projets en cours', value: projectCounts.inProgress, tone: 'blue' },
    { label: 'En attente de validation', value: projectCounts.pending, tone: 'amber' },
  ];

  const availableTrades = Array.from(
    new Set(
      [
        artisan.trade || '',
        ...artisan.services.map((service) => service.serviceCategory || ''),
        ...artisan.products.map((product) => product.category || ''),
      ]
        .map((value) => detectTradeFromText(value) || value.toLowerCase().trim())
        .filter(Boolean)
    )
  );

  const professionalLabel = (() => {
    const raw = (artisan.role || artisan.trade || 'professionnel').toLowerCase();
    if (['vendeur', 'seller', 'vendor'].some((word) => raw.includes(word))) return 'vendeur';
    if (['usine', 'manufacturer', 'fabricant', 'fournisseur', 'supplier'].some((word) => raw.includes(word))) return 'usine';
    if (['artisan', 'craftsman', 'maitre artisan', 'maître artisan'].some((word) => raw.includes(word))) return 'artisan';
    if (['promoteur', 'promoter', 'developpeur', 'constructeur'].some((word) => raw.includes(word))) return 'promoteur';
    return 'professionnel';
  })();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link href="/artisans" className="text-sm font-medium text-blue-600 hover:underline">
            ← Retour aux artisans
          </Link>
        </div>

        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Artisan</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {artisan.companyName || artisan.name}
              </h1>
              <p className="mt-2 text-slate-600">{artisan.name}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-5 py-3 text-sm text-blue-700">
              {artisan.city || 'Ville non renseignée'}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Téléphone</p>
              <p className="mt-2 font-medium text-slate-900">{artisan.phone || 'Non renseigné'}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Adresse</p>
              <p className="mt-2 font-medium text-slate-900">{artisan.address || 'Non renseignée'}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Site web</p>
              <p className="mt-2 font-medium text-slate-900">{artisan.website || 'Non renseigné'}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">Certification AQIL</p>
              <p className="mt-2 text-2xl font-black text-emerald-800">94%</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-emerald-700">Expert certifié</p>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {projectMetrics.map((metric) => (
            <div key={metric.label} className={`rounded-2xl border p-5 shadow-sm ${
              metric.tone === 'emerald'
                ? 'border-emerald-200 bg-emerald-50'
                : metric.tone === 'blue'
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-amber-200 bg-amber-50'
            }`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Prestations</h2>
            {artisan.services.length === 0 ? (
              <p className="mt-4 text-slate-600">Aucune prestation publiée pour le moment.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {artisan.services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{service.serviceCategory}</p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                        {service.unitPrice.toFixed(2)} € / {service.unit}
                      </span>
                    </div>
                    {service.description && <p className="mt-3 text-sm text-slate-600">{service.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Produits</h2>
            {artisan.products.length === 0 ? (
              <p className="mt-4 text-slate-600">Aucun produit publié pour le moment.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {artisan.products.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{product.category}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                        {product.salePrice.toFixed(2)} €
                      </span>
                    </div>
                    {product.description && <p className="mt-3 text-sm text-slate-600">{product.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Demande de devis</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Créer un projet avec {artisan.companyName || artisan.name}</h2>
            </div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
              Sécurisé par PIN projet
            </div>
          </div>

          <ProjectRequestForm
            artisanId={artisan.id}
            artisanName={artisan.companyName || artisan.name || 'Artisan'}
            trade={artisan.trade || 'carreleur'}
            availableTrades={availableTrades}
            professionalLabel={professionalLabel}
            targetRole={(artisan.role || 'artisan') as 'artisan' | 'vendeur' | 'promoteur'}
            defaultValues={{
              clientName: connectedUser?.name ?? '',
              clientPhone: connectedUser?.phone ?? '',
              clientEmail: connectedUser?.email ?? '',
              clientAddress: connectedUser?.address ?? '',
              projectName: `${artisan.companyName || artisan.name || 'Projet'} - demande de devis`,
              projectType: 'Pose de carrelage sol',
              customProjectType: '',
              workType: '',
              description: '',
              solLongueur: '',
              solLargeur: '',
              solSurface: '',
              murLongueur: '',
              murHauteur: '',
              nbMurs: '',
              murSurface: '',
              surface: '',
              budgetEstimate: '',
              specialtyDetails: '',
            }}
          />
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const artisan = await prisma.user.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { name: 'asc' },
      },
      services: {
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!artisan || artisan.trade !== 'artisan') {
    notFound();
  }

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

          <div className="mt-6 grid gap-4 md:grid-cols-3">
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
          </div>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
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
        </div>
      </div>
    </main>
  );
}

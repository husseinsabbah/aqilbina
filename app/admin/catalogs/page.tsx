'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Catalog = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  productCount: number;
  user: {
    id: string;
    name: string;
    email: string;
    companyName?: string | null;
  };
};

type CatalogDetails = Catalog & {
  products: Array<{
    id: string;
    name: string;
    category: string;
    brand?: string | null;
    salePrice: number;
    stock: number;
    createdAt: string;
  }>;
};

export default function AdminCatalogsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogDetails | null>(null);
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

    void loadCatalogs();
  }, [session, status, router]);

  const loadCatalogs = async () => {
    try {
      const res = await fetch('/api/admin/catalogs', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
      setCatalogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erreur lors du chargement des catalogues');
    } finally {
      setLoading(false);
    }
  };

  const openCatalog = async (catalogId: string) => {
    try {
      const res = await fetch(`/api/admin/catalogs/${catalogId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
      setSelectedCatalog(data);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleDelete = async (catalogId: string) => {
    if (!confirm('Supprimer ce catalogue ?')) return;

    try {
      const res = await fetch(`/api/admin/catalogs/${catalogId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Suppression impossible');
      setSelectedCatalog(null);
      await loadCatalogs();
      alert('Catalogue supprimé');
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (status === 'loading' || !session) {
    return <div className="p-8 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Administration</p>
            <h1 className="text-3xl font-bold">Catalogues</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Retour admin
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1.5fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Liste des catalogues</h2>

            {loading ? (
              <p className="text-slate-500">Chargement...</p>
            ) : catalogs.length === 0 ? (
              <p className="text-slate-500">Aucun catalogue.</p>
            ) : (
              <div className="space-y-3">
                {catalogs.map((catalog) => (
                  <div key={catalog.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          onClick={() => openCatalog(catalog.id)}
                          className="text-left font-semibold text-slate-900 hover:text-blue-700"
                        >
                          {catalog.name}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">
                          {catalog.user.name} · {catalog.user.email}
                        </p>
                        {catalog.description && (
                          <p className="mt-2 text-sm text-slate-600">{catalog.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(catalog.id)}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{catalog.productCount} produit(s)</span>
                      <span>{new Date(catalog.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Produits du catalogue</h2>

            {!selectedCatalog ? (
              <p className="text-slate-500">Sélectionnez un catalogue pour voir ses produits.</p>
            ) : (
              <div>
                <div className="mb-4 rounded-xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">{selectedCatalog.name}</h3>
                  <p className="text-sm text-slate-600">
                    Vendeur : {selectedCatalog.user.name} · {selectedCatalog.user.companyName || 'Entreprise non renseignée'}
                  </p>
                </div>

                {selectedCatalog.products.length === 0 ? (
                  <p className="text-slate-500">Aucun produit dans ce catalogue.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Nom</th>
                          <th className="px-3 py-2">Catégorie</th>
                          <th className="px-3 py-2">Marque</th>
                          <th className="px-3 py-2">Prix</th>
                          <th className="px-3 py-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCatalog.products.map((product) => (
                          <tr key={product.id} className="border-t border-slate-200">
                            <td className="px-3 py-2 font-medium">{product.name}</td>
                            <td className="px-3 py-2">{product.category}</td>
                            <td className="px-3 py-2">{product.brand || '—'}</td>
                            <td className="px-3 py-2">{product.salePrice}€</td>
                            <td className="px-3 py-2">{product.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Image as ImageIcon } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ArtisanPortfolioPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'artisan' && session.user.trade !== 'artisan') {
      router.push('/auth/signin');
      return;
    }

    const load = async () => {
      try {
        const res = await fetch('/api/projects', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setProjects(data.filter((project: any) => project.portfolioMedia || project.attachmentUrl));
      } catch (error) {
        console.error('Erreur portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [session, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🎨 Portfolio</h1>
          <button
            onClick={() => router.push('/artisan')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Voir les projets
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
            Aucun projet encore publié dans votre portfolio.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-gray-600">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-gray-800">{project.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{project.type || 'Projet'}</p>
                  <div className="mt-3 text-xs text-gray-500">
                    {project.startDate && <span>Début : {new Date(project.startDate).toLocaleDateString()}</span>}
                    {project.endDate && <span className="ml-2">Fin : {new Date(project.endDate).toLocaleDateString()}</span>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => router.push(`/artisan/projets/${project.id}`)}
                      className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                    >
                      Voir le projet
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

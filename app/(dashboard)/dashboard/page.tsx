export default function DashboardPage() {
    // Données fictives pour le moment (on les connectera plus tard à la base de données)
    const stats = [
      { label: "Projets en cours", value: 3, color: "bg-blue-500" },
      { label: "Produits en stock", value: 124, color: "bg-green-500" },
      { label: "Devis envoyés", value: 7, color: "bg-purple-500" },
      { label: "Chiffre d'affaires (mois)", value: "12 450 €", color: "bg-yellow-500" },
    ];
  
    const recentProjects = [
      { name: "Rénovation cuisine - Dupont", status: "En attente", amount: "3 200 €" },
      { name: "Salle de bain - Martin", status: "En cours", amount: "4 500 €" },
      { name: "Carrelage terrasse - Bernard", status: "Terminé", amount: "1 800 €" },
    ];
  
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">🏗️ Tableau de bord</h1>
          <a
            href="/projets/nouveau"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Nouveau projet
          </a>
        </div>
  
        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold text-gray-800 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
  
        {/* Projets récents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Derniers projets</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="pb-3 text-sm font-medium text-gray-500">Nom du projet</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Statut</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Montant</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project, index) => (
                  <tr key={index} className="border-b border-gray-50">
                    <td className="py-3 text-sm text-gray-800">{project.name}</td>
                    <td className="py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${project.status === "En attente" ? "bg-yellow-100 text-yellow-800" :
                          project.status === "En cours" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-800">{project.amount}</td>
                    <td className="py-3 text-sm">
                      <a href="#" className="text-blue-600 hover:underline">Voir</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  
        {/* Lien vers le Back Office complet */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Accéder au{" "}
          <a href="#" className="text-blue-600 hover:underline">
            catalogue complet
          </a>{" "}
          ou aux{" "}
          <a href="#" className="text-blue-600 hover:underline">
            paramètres
          </a>
        </div>
      </div>
    );
  }
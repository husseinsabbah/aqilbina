"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trade, setTrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName || "Utilisateur",
          companyName,
          email,
          password,
          trade,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      router.push('/login');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-950 to-blue-900 px-4">
      <div className="w-full max-w-md rounded-xl bg-white/10 p-8 backdrop-blur-sm shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center">🏗️ Aqil Bina</h1>
        <p className="mt-2 text-center text-sm text-blue-200">Créez votre compte</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white">Nom de l'entreprise</label>
            <input
              type="text"
              placeholder="Maçonnerie Hassan"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Email</label>
            <input
              type="email"
              placeholder="hassan@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Métier</label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionnez votre métier</option>
              <option value="carreleur">🧱 Carreleur</option>
              <option value="plombier">💧 Plombier</option>
              <option value="electricien">⚡ Électricien</option>
              <option value="peintre">🖌️ Peintre</option>
              <option value="menuisier">🪚 Menuisier</option>
              <option value="maçon">🧱 Maçon</option>
              <option value="couvreur">🏠 Couvreur</option>
              <option value="vendeur">📦 Vendeur de matériaux</option>
              <option value="autres">🔧 Autres</option>
            </select>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Création en cours..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-200">
          Déjà un compte ?{" "}
          <a href="/login" className="font-medium text-white hover:underline">
            Connectez-vous
          </a>
        </p>
      </div>
    </div>
  );
}
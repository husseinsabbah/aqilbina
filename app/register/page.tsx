"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocaleFromStorage, messages, type Locale } from "@/lib/i18n";

const profileOptions = {
  artisan: [
    { value: "carreleur", label: "🧱 Carreleur" },
    { value: "plombier", label: "💧 Plombier" },
    { value: "electricien", label: "⚡ Électricien" },
    { value: "peintre", label: "🎨 Peintre" },
    { value: "menuisier", label: "🪚 Menuisier" },
    { value: "maçon", label: "🧱 Maçon" },
    { value: "couvreur", label: "🏠 Couvreur" },
    { value: "terrassier", label: "🚜 Terrassier" },
    { value: "renovation", label: "🔧 Rénovation" },
    { value: "autres", label: "🔧 Autres" },
  ],
  vendeur: [
    { value: "materiaux", label: "🏗️ Matériaux de construction" },
    { value: "sanitaire", label: "🚿 Sanitaire" },
    { value: "quincaillerie", label: "🧰 Quincaillerie" },
    { value: "menuiserie", label: "🪵 Menuiserie" },
    { value: "isolation", label: "🛡️ Isolation" },
    { value: "outillage", label: "🔨 Outillage" },
    { value: "decoration", label: "🪴 Décoration" },
    { value: "autres", label: "📦 Autres" },
  ],
  promoteur: [
    { value: "promotion-immobiliere", label: "🏠 Promotion immobilière" },
    { value: "gestion-chantier", label: "📋 Gestion de chantier" },
    { value: "maitrise-oeuvre", label: "🧭 Maîtrise d’œuvre" },
    { value: "coordination-travaux", label: "🛠️ Coordination travaux" },
    { value: "aménagement", label: "🧱 Aménagement" },
    { value: "autres", label: "🏢 Autres" },
  ],
} as const;

const profileTypeOptions = [
  { value: "artisan", label: "🏗️ Artisan" },
  { value: "vendeur", label: "📦 Vendeur" },
  { value: "promoteur", label: "🏢 Promoteur" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileType, setProfileType] = useState<"artisan" | "vendeur" | "promoteur" | "">("");
  const [trade, setTrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(getLocaleFromStorage());
  }, []);

  const dict = messages[locale];

  const specialtyOptions = useMemo(() => {
    if (!profileType) return [];
    return profileOptions[profileType as keyof typeof profileOptions] ?? [];
  }, [profileType]);

  useEffect(() => {
    setTrade("");
  }, [profileType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!profileType) {
      setError("Veuillez sélectionner un profil.");
      setLoading(false);
      return;
    }

    if (!trade) {
      setError("Veuillez sélectionner votre spécialité.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: [firstName, lastName].filter(Boolean).join(' ').trim() || companyName || 'Utilisateur',
          firstName,
          lastName,
          age: age ? Number(age) : null,
          phone,
          address,
          companyName,
          email,
          password,
          profileType,
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
        <p className="mt-2 text-center text-sm text-blue-200">{dict.auth.registerSubtitle}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white">Type de profil</label>
            <div className="mt-2 grid gap-2">
              {profileTypeOptions.map((option) => {
                const checked = profileType === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                      checked
                        ? "border-blue-400 bg-blue-500/20 text-white"
                        : "border-blue-300/30 bg-white/5 text-blue-100 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="profileType"
                      value={option.value}
                      checked={checked}
                      onChange={() => {
                        setProfileType(option.value as "artisan" | "vendeur" | "promoteur");
                        setTrade("");
                      }}
                      className="h-4 w-4 accent-blue-500"
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {profileType && (
            <div>
              <label className="block text-sm font-medium text-white">Spécialité</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {specialtyOptions.map((option) => {
                  const selected = trade === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTrade(option.value)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-blue-400 bg-blue-500/20 text-white"
                          : "border-blue-300/30 bg-white/5 text-blue-100 hover:bg-white/10"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white">Nom</label>
            <input
              type="text"
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Prénom</label>
            <input
              type="text"
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Âge</label>
            <input
              type="number"
              min="0"
              max="120"
              placeholder="Âge"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Téléphone</label>
            <input
              type="tel"
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Adresse</label>
            <input
              type="text"
              placeholder="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">{dict.auth.companyName}</label>
            <input
              type="text"
              placeholder={dict.auth.companyName}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">{dict.auth.email}</label>
            <input
              type="email"
              placeholder={dict.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">{dict.auth.password}</label>
            <input
              type="password"
              placeholder={dict.auth.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
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
            {loading ? dict.auth.createMyAccountLoading : dict.auth.createMyAccount}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-200">
          {dict.auth.alreadyHaveAccount}{" "}
          <a href="/login" className="font-medium text-white hover:underline">
            {dict.auth.login}
          </a>
        </p>
      </div>
    </div>
  );
}
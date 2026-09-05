"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    { value: "amenagement", label: "🧱 Aménagement" },
    { value: "autres", label: "🏢 Autres" },
  ],
} as const;

const profileTypeOptions = [
  { value: "artisan", label: "🏗️ Artisan" },
  { value: "vendeur", label: "📦 Vendeur" },
  { value: "promoteur", label: "🏢 Promoteur" },
] as const;

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    age: "",
    phone: "",
    address: "",
    email: "",
    password: "",
    profileType: "",
    trade: "",
    companyName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale] = useState<Locale>(() => getLocaleFromStorage());

  const dict = messages[locale];

  const specialtyOptions = useMemo(() => {
    if (!formData.profileType) return [];
    return profileOptions[formData.profileType as keyof typeof profileOptions] ?? [];
  }, [formData.profileType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'profileType' ? { trade: '' } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.profileType) {
      setError("Veuillez sélectionner un profil.");
      setLoading(false);
      return;
    }

    if (!formData.trade) {
      setError("Veuillez sélectionner votre spécialité.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim() || formData.companyName || "Utilisateur",
          age: formData.age ? Number(formData.age) : null,
          profileType: formData.profileType,
          trade: formData.trade,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      router.push("/auth/signin?registered=true");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {dict.auth.registerTitle}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de profil</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {profileTypeOptions.map((option) => {
                  const selected = formData.profileType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, profileType: option.value, trade: "" }))}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.profileType && (
              <div className="pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Spécialité</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {specialtyOptions.map((option) => {
                    const selected = formData.trade === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, trade: option.value }))}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
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
              <input
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Nom"
              />
            </div>
            <div>
              <input
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Prénom"
              />
            </div>
            <div>
              <input
                name="age"
                type="number"
                min="0"
                max="120"
                value={formData.age}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Âge"
              />
            </div>
            <div>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Téléphone"
              />
            </div>
            <div>
              <input
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Adresse"
              />
            </div>
            <div>
              <input
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={dict.auth.companyNameOptional}
              />
            </div>
            <div>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={`${dict.auth.email} *`}
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={`${dict.auth.password} *`}
              />
            </div>
        
          </div>

          {error && <div className="text-red-600 text-sm text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? dict.auth.createAccountLoading : dict.auth.createAccountButton}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          {dict.auth.alreadyHaveAccount}{" "}
          <Link href={dict.auth.signInUrl} className="font-medium text-blue-600 hover:text-blue-500">
            {dict.auth.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
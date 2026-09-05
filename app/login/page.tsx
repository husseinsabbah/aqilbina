"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getLocaleFromStorage, messages, type Locale } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(getLocaleFromStorage());
  }, []);

  const dict = messages[locale];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(dict.auth.signInError);
        setLoading(false);
        return;
      }

      // Récupérer la session pour connaître le rôle
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      const role = session?.user?.role;
      const trade = session?.user?.trade;

      // Rediriger selon le rôle
      if (role === "vendeur" || trade === "vendeur") {
        router.push("/vendeur");
      } else if (role === "artisan" || trade === "artisan") {
        router.push("/artisan");
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Erreur:", err);
      setError("Une erreur est survenue");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-950 to-blue-900 px-4">
      <div className="w-full max-w-md rounded-xl bg-white/10 p-8 backdrop-blur-sm shadow-2xl">
        <div className="text-center">
          <span className="text-3xl font-bold text-white">🏗️ Aqil Bina</span>
          <p className="mt-2 text-sm text-blue-200">{dict.auth.signInSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              {dict.auth.email}
            </label>
            <input
              id="email"
              type="email"
              placeholder={dict.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              suppressHydrationWarning
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">
              {dict.auth.password}
            </label>
            <input
              id="password"
              type="password"
              placeholder={dict.auth.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              suppressHydrationWarning
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
            suppressHydrationWarning
          >
            {loading ? dict.auth.signInLoading : dict.auth.signInButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-200">
          {dict.auth.noAccount}{" "}
          <a href="/register" className="font-medium text-white hover:underline">
            {dict.auth.createAccount}
          </a>
        </p>
      </div>
    </div>
  );
}
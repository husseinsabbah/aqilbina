"use client";

import Link from "next/link";

export default function AuthError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-red-600">⚠️ Erreur d'authentification</h1>
        <p className="mt-4 text-gray-700">
          Une erreur est survenue lors de la connexion. Veuillez réessayer.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
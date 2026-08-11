export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-950 to-blue-900">
      <h1 className="text-5xl font-bold text-white mb-4">
        🏗️ Aqil Bina
      </h1>
      <p className="text-xl text-blue-200 text-center max-w-2xl">
        L'IA qui construit votre projet de A à Z.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          Connexion
        </a>
        <a
          href="/register"
          className="px-6 py-3 border border-white text-white hover:bg-white/10 rounded-lg transition"
        >
          S'inscrire
        </a>
      </div>
    </main>
  );
}
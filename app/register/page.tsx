export default function RegisterPage() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-950 to-blue-900 px-4">
        <div className="w-full max-w-md rounded-xl bg-white/10 p-8 backdrop-blur-sm shadow-2xl">
          <h1 className="text-3xl font-bold text-white text-center">🏗️ Aqil Bina</h1>
          <p className="mt-2 text-center text-sm text-blue-200">Créez votre compte artisan</p>
  
          <form className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-white">Nom de l'entreprise</label>
              <input
                type="text"
                placeholder="Maçonnerie Hassan"
                className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Email</label>
              <input
                type="email"
                placeholder="hassan@exemple.com"
                className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-white placeholder:text-blue-200/50"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Créer mon compte
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
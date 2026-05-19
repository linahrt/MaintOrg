import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PocketBase from "pocketbase";

// ─── Config ────────────────────────────────────────────────────────────────────
const PB_URL = "http://127.0.0.1:8090"; // ← Changez selon votre instance
const pb = new PocketBase(PB_URL);

// ─── Component ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [checking, setChecking] = useState(true);

  // ── Si déjà connecté → dashboard immédiatement ──────────────────────────────
  useEffect(() => {
    if (pb.authStore.isValid) {
      navigate("/dashboard", { replace: true });
    } else {
      setChecking(false);
    }
  }, [navigate]);

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      await pb.collection("users").authWithPassword(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.status === 400) {
        setError("Email ou mot de passe incorrect.");
      } else if (!err.status || err.message?.toLowerCase().includes("fetch")) {
        setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
      } else {
        setError(err.message || "Une erreur est survenue.");
      }
      setLoading(false);
    }
  };

  if (checking) return null; // Évite le flash de la page login

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-base-200 p-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .brand { font-family: 'Syne', sans-serif; }
      `}</style>

      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body gap-0 p-8">

          {/* Logo + Marque */}
          <div className="flex items-center gap-3 mb-7">
            <span className="brand font-bold text-2xl text-base-content">MaintOrg</span>
          </div>

          <h1 className="brand text-xl font-bold text-base-content mb-1">Connexion</h1>
          <p className="text-sm text-base-content/60 mb-6">Accédez à votre espace personnel</p>

          <div className="divider my-0 mb-6" />

          {/* Erreur */}
          {error && (
            <div className="alert alert-error mb-5 py-3 text-sm rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            {/* Email */}
            <label className="form-control w-full">
              <div className="label pb-1">
                <span className="label-text text-xs tracking-widest text-base-content/50">
                  Email
                </span>
              </div>
              <label className="input input-bordered flex items-center gap-2 focus-within:outline-none focus-within:border-sky-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 01-8 0 4 4 0 018 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                </svg>
                <input
                  type="email"
                  className="grow bg-transparent text-sm outline-none"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </label>
            </label>

            {/* Mot de passe */}
            <label className="form-control w-full">
              <div className="label pb-1">
                <span className="label-text text-xs tracking-widest text-base-content/50">
                  Mot de passe
                </span>
              </div>
              <label className="input input-bordered flex items-center gap-2 focus-within:outline-none focus-within:border-sky-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <input
                  type={showPw ? "text" : "password"}
                  className="grow bg-transparent text-sm outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-base-content/40 hover:text-base-content/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  )}
                </button>
              </label>
              <div className="label pt-1">
                <span />
                <a className="label-text-alt text-sky-500 hover:text-sky-400 cursor-pointer transition-colors">
                  Mot de passe oublié ?
                </a>
              </div>
            </label>

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn w-full border-none text-white font-bold tracking-wide mt-1"
              style={{
                background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="divider my-5" />

          <p className="text-center text-xs text-base-content/50">
            Pas encore de compte ?{" "}
            <a className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer transition-colors">
              Créer un compte
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
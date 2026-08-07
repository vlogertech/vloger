import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";

export default function Login() {
  const { loginWithEmailPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmailPassword({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
    // Le navigateur redirige — setGoogleLoading reste true pendant la transition
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111' }}>

      {/* Overlay chargement Google */}
      {googleLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: '#111111' }}>
          <span className="text-sm font-light tracking-widest mb-6" style={{ color: '#C9A84C', letterSpacing: '0.25em' }}>VLOGER</span>
          <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-14 pb-12">
        <Link to="/welcome" className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.2em' }}>
          VLOGER
        </Link>
      </div>

      <div className="flex-1 px-8">
        <h2 className="text-3xl font-light text-white mb-2" style={{ letterSpacing: '-0.01em' }}>Connexion</h2>
        <p className="text-xs font-light mb-12" style={{ color: '#555', letterSpacing: '0.04em' }}>
          Content de te revoir.
        </p>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-4 mb-8 text-xs font-light tracking-wider"
          style={{ border: '1px solid #2a2a2a', borderRadius: 2, color: googleLoading ? '#444' : '#777', letterSpacing: '0.08em' }}
        >
          {googleLoading ? (
            <Loader2 size={13} strokeWidth={1.5} style={{ color: '#C9A84C' }} className="animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
          )}
          {googleLoading ? 'REDIRECTION...' : 'CONTINUER AVEC GOOGLE'}
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e1e1e' }} />
          <span className="text-xs font-light" style={{ color: '#333', letterSpacing: '0.1em' }}>OU</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e1e1e' }} />
        </div>

        {error && (
          <div className="mb-6 py-3 px-4 text-xs font-light" style={{ border: '1px solid #5a1a1a', backgroundColor: '#1a0a0a', color: '#cc6666', borderRadius: 2 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>EMAIL</label>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="ton@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full py-3.5 px-0 text-sm font-light text-white outline-none"
              style={{ backgroundColor: 'transparent', borderBottom: '1px solid #2a2a2a', borderRadius: 0, caretColor: '#C9A84C' }}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-light" style={{ color: '#555', letterSpacing: '0.08em' }}>MOT DE PASSE</label>
              <Link to="/forgot-password" className="text-xs font-light" style={{ color: '#C9A84C', letterSpacing: '0.04em' }}>
                Oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full py-3.5 px-0 text-sm font-light text-white outline-none pr-8"
                style={{ backgroundColor: 'transparent', borderBottom: '1px solid #2a2a2a', borderRadius: 0, caretColor: '#C9A84C' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2"
                style={{ color: '#444' }}
              >
                {showPassword ? <EyeOff size={14} strokeWidth={1} /> : <Eye size={14} strokeWidth={1} />}
              </button>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-between w-full px-7 py-4"
              style={{ backgroundColor: '#C9A84C', borderRadius: 2, opacity: loading ? 0.7 : 1 }}
            >
              <span className="text-xs font-light tracking-widest" style={{ color: '#111111', letterSpacing: '0.12em' }}>
                {loading ? 'CONNEXION...' : 'SE CONNECTER'}
              </span>
              {loading ? <Loader2 size={13} strokeWidth={1.5} style={{ color: '#111' }} className="animate-spin" /> : <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#111111' }} />}
            </button>
          </div>
        </form>
      </div>

      <div className="px-8 pb-14 text-center">
        <p className="text-xs font-light" style={{ color: '#444', letterSpacing: '0.04em' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: '#C9A84C' }}>Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
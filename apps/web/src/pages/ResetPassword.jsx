import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, Eye, EyeOff, ChevronRight } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false); // session récupérée depuis le lien
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const inputStyle = { backgroundColor: 'transparent', borderBottom: '1px solid #2a2a2a', borderRadius: 0, caretColor: '#C9A84C' };

  // Supabase envoie le token dans le hash (#access_token=...&type=recovery)
  // onAuthStateChange le détecte automatiquement avec l'event PASSWORD_RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Si déjà une session active (ex: retour sur la page), on autorise aussi
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }
    if (newPassword.length < 8) { setError("Min. 8 caractères"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message || "Erreur de réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111' }}>
      <div className="px-8 pt-14 pb-10">
        <Link to="/login" className="text-xs font-light tracking-widest block mb-12" style={{ color: '#C9A84C', letterSpacing: '0.2em' }}>
          VLOGER
        </Link>
        <h2 className="text-3xl font-light text-white mb-2" style={{ letterSpacing: '-0.01em' }}>
          {done ? 'Mot de passe modifié.' : 'Nouveau mot de passe.'}
        </h2>
      </div>

      <div className="flex-1 px-8">
        {done ? (
          <div className="pt-2">
            <p className="text-sm font-light mb-8" style={{ color: '#666' }}>
              Ton mot de passe a été réinitialisé. Redirection en cours...
            </p>
            <Link to="/" className="flex items-center justify-between w-full px-7 py-4" style={{ backgroundColor: '#C9A84C', borderRadius: 2 }}>
              <span className="text-xs font-light tracking-widest" style={{ color: '#111', letterSpacing: '0.12em' }}>ACCUEIL</span>
              <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#111' }} />
            </Link>
          </div>
        ) : !ready ? (
          <div className="pt-2">
            <p className="text-sm font-light mb-8" style={{ color: '#666' }}>
              Lien invalide ou expiré. Demande un nouveau lien de réinitialisation.
            </p>
            <Link to="/forgot-password" className="flex items-center justify-between w-full px-7 py-4" style={{ border: '1px solid #C9A84C44', borderRadius: 2 }}>
              <span className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.12em' }}>NOUVEAU LIEN</span>
              <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#C9A84C' }} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="py-3 px-4 text-xs font-light" style={{ border: '1px solid #5a1a1a', backgroundColor: '#1a0a0a', color: '#cc6666', borderRadius: 2 }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>NOUVEAU MOT DE PASSE</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} autoComplete="new-password" autoFocus placeholder="Min. 8 caractères"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full py-3.5 px-0 text-sm font-light text-white outline-none pr-7"
                  style={inputStyle} required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-3.5" style={{ color: '#444' }}>
                  {showPassword ? <EyeOff size={14} strokeWidth={1} /> : <Eye size={14} strokeWidth={1} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>CONFIRMER</label>
              <input
                type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full py-3.5 px-0 text-sm font-light text-white outline-none"
                style={inputStyle} required
              />
            </div>
            {newPassword.length > 0 && (
              <div className="flex gap-1 pt-1">
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 1, backgroundColor: newPassword.length >= i * 3 ? (i <= 2 ? '#7a3a3a' : i === 3 ? '#7a6a2a' : '#C9A84C') : '#222' }} />
                ))}
              </div>
            )}
            <div className="pt-4">
              <button
                type="submit" disabled={loading}
                className="flex items-center justify-between w-full px-7 py-4"
                style={{ backgroundColor: '#C9A84C', borderRadius: 2, opacity: loading ? 0.7 : 1 }}
              >
                <span className="text-xs font-light tracking-widest" style={{ color: '#111', letterSpacing: '0.12em' }}>
                  {loading ? 'RÉINITIALISATION...' : 'RÉINITIALISER'}
                </span>
                {loading ? <Loader2 size={13} className="animate-spin" style={{ color: '#111' }} /> : <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#111' }} />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

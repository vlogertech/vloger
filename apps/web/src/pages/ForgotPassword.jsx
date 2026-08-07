import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ChevronRight, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' }); } catch {}
    finally { setLoading(false); setSent(true); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111' }}>
      <div className="px-8 pt-14 pb-10">
        <Link to="/login" className="text-xs font-light tracking-widest block mb-12" style={{ color: '#C9A84C', letterSpacing: '0.2em' }}>
          VLOGER
        </Link>
        <h2 className="text-3xl font-light text-white mb-2" style={{ letterSpacing: '-0.01em' }}>
          {sent ? 'Email envoyé.' : 'Mot de passe\noublié ?'}
        </h2>
        <p className="text-xs font-light" style={{ color: '#555', letterSpacing: '0.04em' }}>
          {sent ? `Vérifie ta boîte ${email}` : 'On t\'envoie un lien de réinitialisation.'}
        </p>
      </div>

      <div className="flex-1 px-8">
        {sent ? (
          <div className="pt-8">
            <div className="mb-10 p-6" style={{ border: '1px solid #2a2a2a', borderRadius: 2 }}>
              <p className="text-xs font-light leading-relaxed" style={{ color: '#666', letterSpacing: '0.03em' }}>
                Si un compte est associé à <span style={{ color: '#C9A84C' }}>{email}</span>, tu recevras un lien de réinitialisation dans quelques minutes.
                <br /><br />
                Pense à vérifier tes spams.
              </p>
            </div>
            <Link
              to="/login"
              className="flex items-center gap-2 text-xs font-light"
              style={{ color: '#666', letterSpacing: '0.06em' }}
            >
              <ArrowLeft size={13} strokeWidth={1} style={{ color: '#C9A84C' }} />
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>EMAIL</label>
              <input
                type="email" autoComplete="email" autoFocus placeholder="ton@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full py-3.5 px-0 text-sm font-light text-white outline-none"
                style={{ backgroundColor: 'transparent', borderBottom: '1px solid #2a2a2a', borderRadius: 0, caretColor: '#C9A84C' }}
                required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="flex items-center justify-between w-full px-7 py-4 mt-4"
              style={{ backgroundColor: '#C9A84C', borderRadius: 2, opacity: loading ? 0.7 : 1 }}
            >
              <span className="text-xs font-light tracking-widest" style={{ color: '#111', letterSpacing: '0.12em' }}>
                {loading ? 'ENVOI...' : 'ENVOYER LE LIEN'}
              </span>
              {loading ? <Loader2 size={13} className="animate-spin" style={{ color: '#111' }} /> : <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#111' }} />}
            </button>
          </form>
        )}
      </div>

      <div className="px-8 pb-12">
        <Link to="/login" className="flex items-center gap-2 text-xs font-light" style={{ color: '#444' }}>
          <ArrowLeft size={13} strokeWidth={1} /> Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";

export default function Register() {
  const { registerWithEmailPassword } = useAuth();
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const inputStyle = {
    backgroundColor: 'transparent',
    borderBottom: '1px solid #2a2a2a',
    borderRadius: 0,
    caretColor: '#C9A84C',
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 8) { setError("Min. 8 caractères"); return; }
    setLoading(true);
    try {
      await registerWithEmailPassword({ email, password });
      setStep("otp");
    } catch (err) {
      setError(err.message || "Échec de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(""); setLoading(true);
    try {
  const { error } = await supabase.auth.verifyOtp({
  email,
  token: otpCode,
  type: "signup",
});

if (error) throw error;
      setStep("profile");
    } catch (err) {
      setError(err.message || "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {const { error } = await supabase.auth.resend({
  type: "signup",
  email,
});

if (error) throw error; } catch (err) { setError(err.message); }
  };

  const handleCreateProfile = async () => {
    if (!username.trim()) { setError("Le pseudonyme est requis"); return; }
    setError(""); setLoading(true);
    try {
  const {
  data: { user },
  error,
} = await supabase.auth.getUser();

if (error || !user) {
  throw new Error("Utilisateur non trouvé");
}

await supabase
  .from("profiles")
  .insert({
    id: user.id,
    username: username.trim().toLowerCase().replace(/\s+/g, '_'),
    display_name: displayName.trim() || username.trim(),
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
  });

      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Erreur de création du profil");
    } finally {
      setLoading(false);
    }
  };

  const Header = ({ title, sub }) => (
    <div className="px-8 pt-14 pb-10">
      <Link to="/welcome" className="text-xs font-light tracking-widest block mb-12" style={{ color: '#C9A84C', letterSpacing: '0.2em' }}>
        VLOGER
      </Link>
      <h2 className="text-3xl font-light text-white mb-2" style={{ letterSpacing: '-0.01em' }}>{title}</h2>
      <p className="text-xs font-light" style={{ color: '#555', letterSpacing: '0.04em' }}>{sub}</p>
    </div>
  );

  const ErrorBox = () => error ? (
    <div className="mb-5 py-3 px-4 text-xs font-light" style={{ border: '1px solid #5a1a1a', backgroundColor: '#1a0a0a', color: '#cc6666', borderRadius: 2 }}>
      {error}
    </div>
  ) : null;

  if (step === "otp") {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111' }}>
        <Header title="Vérifie ton email." sub={`Code envoyé à ${email}`} />
        <div className="flex-1 px-8">
          <ErrorBox />
          <div className="flex justify-center mb-10">
            {/* Type-safe fallback: use simple wrapper without strict OTP slot props */}
            <input value={otpCode} onChange={e => setOtpCode(e.target.value)} autoFocus autoComplete="one-time-code" maxLength={6} className="w-40 py-3.5 px-3 text-sm font-light text-white outline-none" style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid #C9A84C44', borderRadius: 0 }} />
          </div>
          <button
            onClick={handleVerify}
            disabled={loading || otpCode.length < 6}
            className="flex items-center justify-between w-full px-7 py-4 mb-5"
            style={{ backgroundColor: '#C9A84C', borderRadius: 2, opacity: (loading || otpCode.length < 6) ? 0.5 : 1 }}
          >
            <span className="text-xs font-light tracking-widest" style={{ color: '#111', letterSpacing: '0.12em' }}>
              {loading ? 'VÉRIFICATION...' : 'VÉRIFIER'}
            </span>
            {loading ? <Loader2 size={13} className="animate-spin" style={{ color: '#111' }} /> : <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#111' }} />}
          </button>
          <button onClick={handleResend} className="w-full text-center text-xs font-light py-3" style={{ color: '#444', letterSpacing: '0.05em' }}>
            Renvoyer le code
          </button>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111' }}>
        <Header title="Crée ton profil." sub="Comment veux-tu être connu ?" />
        <div className="flex-1 px-8">
          <ErrorBox />
          <div className="space-y-6 mb-10">
            <div>
              <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>PSEUDONYME *</label>
              <div className="relative">
                <span className="absolute left-0 top-3.5 text-sm font-light" style={{ color: '#444' }}>@</span>
                <input
                  type="text"
                  autoFocus
                  placeholder="mon_pseudo"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="w-full py-3.5 pl-5 pr-0 text-sm font-light text-white outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>NOM AFFICHÉ</label>
              <input
                type="text"
                placeholder="Ton nom"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full py-3.5 px-0 text-sm font-light text-white outline-none"
                style={inputStyle}
              />
            </div>
          </div>
          <button
            onClick={handleCreateProfile}
            disabled={loading || !username.trim()}
            className="flex items-center justify-between w-full px-7 py-4"
            style={{ backgroundColor: '#C9A84C', borderRadius: 2, opacity: (loading || !username.trim()) ? 0.5 : 1 }}
          >
            <span className="text-xs font-light tracking-widest" style={{ color: '#111', letterSpacing: '0.12em' }}>
              {loading ? 'CRÉATION...' : 'COMMENCER'}
            </span>
            {loading ? <Loader2 size={13} className="animate-spin" style={{ color: '#111' }} /> : <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#111' }} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111' }}>
      <Header title="Créer un compte." sub="Rejoins la communauté des créateurs." />

      {googleLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: '#111111' }}>
          <span className="text-sm font-light tracking-widest mb-6" style={{ color: '#C9A84C', letterSpacing: '0.25em' }}>VLOGER</span>
          <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
        </div>
      )}
      <div className="flex-1 px-8">
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-4 mb-7 text-xs font-light tracking-wider"
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

        <div className="flex items-center gap-4 mb-7">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e1e1e' }} />
          <span className="text-xs font-light" style={{ color: '#333', letterSpacing: '0.1em' }}>OU</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e1e1e' }} />
        </div>

        <ErrorBox />

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>EMAIL</label>
            <input
              type="email" autoComplete="email" autoFocus placeholder="ton@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full py-3.5 px-0 text-sm font-light text-white outline-none"
              style={inputStyle} required
            />
          </div>
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>MOT DE PASSE</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Min. 8 caractères"
                value={password} onChange={e => setPassword(e.target.value)}
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
          {password.length > 0 && (
            <div className="flex gap-1 pt-1">
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 1, backgroundColor: password.length >= i * 3 ? (i <= 2 ? '#7a3a3a' : i === 3 ? '#7a6a2a' : '#C9A84C') : '#222' }} />
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
                {loading ? 'CRÉATION...' : 'CRÉER MON COMPTE'}
              </span>
              {loading ? <Loader2 size={13} className="animate-spin" style={{ color: '#111' }} /> : <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#111' }} />}
            </button>
          </div>
        </form>

        <p className="text-xs font-light text-center mt-5" style={{ color: '#333', letterSpacing: '0.03em' }}>
          Conditions d'utilisation · Politique de confidentialité
        </p>
      </div>
      <div className="px-8 pb-12 text-center">
        <p className="text-xs font-light" style={{ color: '#444' }}>
          Déjà un compte ? <Link to="/login" style={{ color: '#C9A84C' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
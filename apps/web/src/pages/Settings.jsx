import { useState, useEffect } from 'react';
import { getUser, dbFilter, dbCreate, dbUpdate } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ username: '', display_name: '', bio: '', website: '', country: '', city: '', is_private: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const inputStyle = { backgroundColor: 'transparent', borderBottom: '1px solid #2a2a2a', borderRadius: 0, caretColor: '#C9A84C' };

  useEffect(() => {
    const init = async () => {
      const me = await getUser().catch(() => null);
      setCurrentUser(me);
      if (!me) return;
      const profiles = await dbFilter('profiles', { user_id: me.id });
      const p = profiles[0] || null;
      setProfile(p);
      if (p) {
        setForm({ username: p.username || '', display_name: p.display_name || me.user_metadata?.full_name || '', bio: p.bio || '', website: p.website || '', country: p.country || '', city: p.city || '', is_private: p.is_private || false });
        setAvatarPreview(p.avatar_url || null);
        setBannerPreview(p.banner_url || null);
      } else {
        setForm(f => ({ ...f, display_name: me.user_metadata?.full_name || '', username: me.email?.split('@')[0] || '' }));
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url || null;
      let bannerUrl = profile?.banner_url || null;
      if (avatarFile) avatarUrl = await uploadFile(avatarFile, 'avatars');
      if (bannerFile) bannerUrl = await uploadFile(bannerFile, 'banners');
      const data = { ...form, user_id: currentUser.id, avatar_url: avatarUrl, banner_url: bannerUrl };
      if (profile) {
        await dbUpdate('profiles', profile.id, data);
      } else {
        const created = await dbCreate('profiles', data);
        setProfile(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { alert('Erreur lors de la sauvegarde'); }
    setSaving(false);
  };

  const FIELDS = [
    { key: 'display_name', label: 'NOM AFFICHÉ', placeholder: 'Ton nom' },
    { key: 'username', label: 'PSEUDONYME', placeholder: 'mon_pseudo' },
    { key: 'bio', label: 'BIO', placeholder: 'Présente-toi...', multiline: true },
    { key: 'website', label: 'SITE WEB', placeholder: 'https://...' },
    { key: 'country', label: 'PAYS', placeholder: 'France' },
    { key: 'city', label: 'VILLE', placeholder: 'Paris' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-6" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <Link to="/profile" style={{ color: '#555' }}>
          <ArrowLeft size={18} strokeWidth={1.2} />
        </Link>
        <p className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.15em' }}>PARAMÈTRES</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-light tracking-wider"
          style={{ color: saved ? '#C9A84C' : '#666', letterSpacing: '0.08em', opacity: saving ? 0.5 : 1 }}
        >
          {saving ? '...' : saved ? 'SAUVEGARDÉ' : 'SAUVEGARDER'}
        </button>
      </div>

      <div className="px-6 py-8">
        {/* Cover + Avatar */}
        <div className="mb-10">
          {/* Banner */}
          <label className="block cursor-pointer mb-3">
            <div
              className="relative w-full overflow-hidden"
              style={{ height: 100, borderRadius: 2, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              {bannerPreview
                ? <img src={bannerPreview} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.7)' }} />
                : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a1a1a, #222)' }} />
              }
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-light" style={{ color: '#555', letterSpacing: '0.1em', fontSize: '10px' }}>PHOTO DE COUVERTURE</span>
              </div>
            </div>
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){setBannerFile(f);setBannerPreview(URL.createObjectURL(f));} }} className="hidden" />
          </label>
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <label className="cursor-pointer">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-thin mb-1.5 relative"
                style={{ backgroundColor: '#1a1a1a', border: '2px solid #111111', outline: '1px solid #2a2a2a', color: '#C9A84C' }}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-full h-full rounded-full object-cover" />
                  : (form.display_name || 'V')[0].toUpperCase()
                }
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C9A84C', border: '2px solid #111' }}>
                  <span style={{ fontSize: 9, color: '#111', fontWeight: 500 }}>+</span>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f));} }} className="hidden" />
            </label>
            <p className="text-xs font-light" style={{ color: '#444', letterSpacing: '0.05em', fontSize: '10px' }}>PHOTO DE PROFIL</p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-6 mb-10">
          {FIELDS.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>{field.label}</label>
              {field.multiline ? (
                <textarea
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full py-2 px-0 text-sm font-light text-white outline-none resize-none"
                  style={inputStyle}
                />
              ) : (
                <input
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full py-3.5 px-0 text-sm font-light text-white outline-none"
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        {/* Privacy toggle */}
        <div className="flex items-center justify-between py-4 mb-8" style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
          <div>
            <p className="text-xs font-light text-white mb-0.5" style={{ letterSpacing: '0.04em' }}>Compte privé</p>
            <p className="text-xs font-light" style={{ color: '#555', fontSize: '11px' }}>Seuls tes abonnés voient tes publications</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, is_private: !f.is_private }))}
            className="relative"
            style={{ width: 40, height: 22 }}
          >
            <div style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: form.is_private ? '#C9A84C22' : '#1e1e1e', border: `1px solid ${form.is_private ? '#C9A84C44' : '#2a2a2a'}`, transition: 'all 0.2s' }} />
            <div style={{ position: 'absolute', top: 4, left: form.is_private ? 20 : 4, width: 14, height: 14, borderRadius: '50%', backgroundColor: form.is_private ? '#C9A84C' : '#444', transition: 'all 0.2s' }} />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-4 text-xs font-light tracking-wider text-center"
          style={{ border: '1px solid #2a2a2a', borderRadius: 2, color: '#666', letterSpacing: '0.1em' }}
        >
          SE DÉCONNECTER
        </button>
      </div>
    </div>
  );
}
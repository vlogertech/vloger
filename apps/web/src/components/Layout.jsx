import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Bell, MessageCircle, User, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isActive = (path) => location.pathname === path;

  // Charger les compteurs non lus
  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      const [{ count: notifCount }, { count: msgCount }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).contains('participant_ids', [user.id]).gt('unread_count', 0),
      ]);
      setUnreadNotifs(notifCount || 0);
      setUnreadMessages(msgCount || 0);
    };

    loadCounts();

    // Realtime notifications
    const channel = supabase
      .channel(`layout:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => loadCounts()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' },
        () => loadCounts()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const NAV = [
    { path: '/', icon: Home },
    { path: '/search', icon: Search },
    { path: '/notifications', icon: Bell, badge: unreadNotifs },
    { path: '/messages', icon: MessageCircle, badge: unreadMessages },
    { path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto relative" style={{ backgroundColor: '#111111' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#111111', borderBottom: '1px solid #1a1a1a' }}>
        <Link to="/dashboard" className="tracking-widest text-xs font-light" style={{ color: '#C9A84C', letterSpacing: '0.2em' }}>
          VLOGER
        </Link>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-7 h-7 flex items-center justify-center"
          style={{ color: '#C9A84C' }}
        >
          <Plus size={18} strokeWidth={1.2} />
        </button>
      </div>

      {/* Main */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Create sheet */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-lg mx-auto p-8 pb-12"
            style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-8 h-px mx-auto mb-8" style={{ backgroundColor: '#333' }} />
            <p className="text-xs tracking-widest font-light mb-8" style={{ color: '#666', letterSpacing: '0.15em' }}>CRÉER</p>
            <div className="space-y-4">
              {[
                { to: '/create/vlog', title: 'Vlog', sub: 'Publier une vidéo' },
                { to: '/create/voice', title: 'Voice Post', sub: 'Enregistrer ta voix' },
              ].map(({ to, title, sub }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setShowCreate(false)}
                  className="flex items-center justify-between p-5"
                  style={{ border: '1px solid #2a2a2a', borderRadius: 2 }}
                >
                  <div>
                    <p className="text-white font-light text-sm tracking-wide">{title}</p>
                    <p className="text-xs mt-1 font-light" style={{ color: '#555' }}>{sub}</p>
                  </div>
                  <div className="w-px h-8" style={{ backgroundColor: '#C9A84C', opacity: 0.4 }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 flex items-center justify-around px-6 py-4"
        style={{ backgroundColor: '#111111', borderTop: '1px solid #1e1e1e' }}
      >
        {NAV.map(({ path, icon: Icon, badge }) => {
          const active = isActive(path);
          return (
            <Link key={path} to={path} className="flex flex-col items-center gap-2 relative py-1">
              {active && (
                <span className="absolute -top-1 w-4 h-px" style={{ backgroundColor: '#C9A84C' }} />
              )}
              <div className="relative">
                <Icon size={19} strokeWidth={1.2} style={{ color: active ? '#C9A84C' : '#444444' }} />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#C9A84C', fontSize: '8px', color: '#111', fontWeight: 600, padding: '0 3px' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

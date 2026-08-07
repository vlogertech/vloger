import { useState, useEffect } from 'react';
import { getUser, dbFilter, dbUpdate } from '@/lib/db';
import { Loader2 } from 'lucide-react';

const TYPE_LABELS = {
  like: 'a aimé ta publication',
  comment: 'a commenté ta publication',
  follow: 'a commencé à te suivre',
  mention: 't\'a mentionné',
  share: 'a partagé ta publication',
  reply: 'a répondu à ton commentaire',
};

/** @param {string} date */
const fmt = (date) => {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return 'maintenant';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}j`;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const me = await getUser().catch(() => null);
      if (!me) { setLoading(false); return; }
      const data = await dbFilter('notifications', { user_id: me.id }, '-created_date', 50).catch(() => []);
      setNotifications(data);
      data.filter(n => !n.read).forEach(n => dbUpdate('notifications', n.id, { read: true }).catch(() => {}));
      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <p className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.15em' }}>NOTIFICATIONS</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={18} strokeWidth={1} style={{ color: '#C9A84C' }} className="animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-xs font-light" style={{ color: '#333', letterSpacing: '0.08em' }}>AUCUNE NOTIFICATION</p>
          <p className="text-xs font-light mt-2" style={{ color: '#2a2a2a' }}>Tes interactions apparaîtront ici.</p>
        </div>
      ) : (
        <div>
          {notifications.map(n => (
            <div
              key={n.id}
              className="flex items-start gap-3 px-6 py-4"
              style={{
                borderBottom: '1px solid #1a1a1a',
                backgroundColor: n.read ? 'transparent' : '#C9A84C06',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-light flex-shrink-0"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#C9A84C' }}
              >
                {(n.actor_name || 'V')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-light text-white leading-relaxed">
                  <span style={{ color: '#aaa' }}>{n.actor_name || 'Quelqu\'un'}</span>{' '}
                  <span style={{ color: '#666' }}>{TYPE_LABELS[n.type] || n.message || 'a interagi'}</span>
                </p>
                <p className="text-xs font-light mt-0.5" style={{ color: '#444', fontSize: '10px' }}>{fmt(n.created_date)}</p>
              </div>
              {!n.read && (
                <div className="w-1 h-1 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: '#C9A84C' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
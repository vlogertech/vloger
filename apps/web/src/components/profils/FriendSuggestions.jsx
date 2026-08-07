import { useState, useEffect } from 'react';
import { dbList, dbFilter, dbCreate } from '@/lib/db';
import { Link } from 'react-router-dom';
import { UserPlus, X } from 'lucide-react';

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

export default function FriendSuggestions({ currentUserId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [followed, setFollowed] = useState(new Set());

  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      const [allProfiles, myFollows] = await Promise.all([
        dbList('profiles', '-followers_count', 20),
        dbFilter('follows', { follower_id: currentUserId }),
      ]);
      const followingIds = new Set(myFollows.map(f => f.following_id));
      const suggs = allProfiles.filter(p => p.user_id !== currentUserId && !followingIds.has(p.user_id));
      setSuggestions(suggs.slice(0, 6));
    };
    load();
  }, [currentUserId]);

  const handleFollow = async (profile) => {
    setFollowed(s => new Set([...s, profile.user_id]));
    await dbCreate('follows', { follower_id: currentUserId, following_id: profile.user_id }).catch(() => {});
  };

  const visible = suggestions.filter(p => !dismissed.has(p.user_id));
  if (visible.length === 0) return null;

  return (
    <div className="px-6 py-5" style={{ borderBottom: '1px solid #1a1a1a' }}>
      <p className="text-xs font-light mb-4" style={{ color: '#555', letterSpacing: '0.12em' }}>SUGGESTIONS</p>
      <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {visible.map(p => (
          <div
            key={p.id}
            className="flex-shrink-0 flex flex-col items-center relative"
            style={{ width: 72 }}
          >
            <button
              onClick={() => setDismissed(s => new Set([...s, p.user_id]))}
              className="absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#2a2a2a', zIndex: 1 }}
            >
              <X size={8} strokeWidth={2} style={{ color: '#666' }} />
            </button>

            <Link to={`/profile/${p.user_id}`}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-light mb-1.5"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#C9A84C' }}
              >
                {p.avatar_url
                  ? <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : (p.display_name || p.username || 'V')[0].toUpperCase()
                }
              </div>
            </Link>
            <p className="text-xs font-light text-white text-center truncate w-full" style={{ fontSize: '10px' }}>
              {p.display_name || p.username}
            </p>
            <p className="text-xs font-light text-center mb-2" style={{ color: '#555', fontSize: '9px' }}>
              {fmt(p.followers_count)} followers
            </p>
            <button
              onClick={() => handleFollow(p)}
              disabled={followed.has(p.user_id)}
              className="flex items-center gap-1 px-2.5 py-1"
              style={{
                border: `1px solid ${followed.has(p.user_id) ? '#2a2a2a' : '#C9A84C44'}`,
                color: followed.has(p.user_id) ? '#444' : '#C9A84C',
                fontSize: '9px',
                letterSpacing: '0.06em',
              }}
            >
              {followed.has(p.user_id) ? '✓' : <UserPlus size={8} strokeWidth={1.5} />}
              {followed.has(p.user_id) ? 'SUIVI' : 'SUIVRE'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
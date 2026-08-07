import { useState, useEffect } from 'react';
import { dbList } from '@/lib/db';
import { Search, Play, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';

const TAGS = ['voyage', 'musique', 'podcast', 'humour', 'cuisine', 'sport', 'tech', 'art', 'mode', 'cinéma'];

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ posts: [], users: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults({ posts: [], users: [] }); return; }
    const t = setTimeout(() => doSearch(), 400);
    return () => clearTimeout(t);
  }, [query]);

  const doSearch = async () => {
    setLoading(true);
    try {
      const [posts, profiles] = await Promise.all([
        dbList('posts', '-created_date', 20),
        dbList('profiles', '-followers_count', 20),
      ]);
      const q = query.toLowerCase();
      setResults({
        posts: posts.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.hashtags?.some(h => h.toLowerCase().includes(q)) || p.author_name?.toLowerCase().includes(q)),
        users: profiles.filter(u => u.username?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q)),
      });
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Search */}
      <div className="sticky top-0 z-30 px-6 py-4" style={{ backgroundColor: '#111111', borderBottom: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-3" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <Search size={14} strokeWidth={1.2} style={{ color: '#555', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher créateurs, vlogs, hashtags..."
            className="flex-1 py-3 text-sm font-light text-white outline-none"
            style={{ backgroundColor: 'transparent', caretColor: '#C9A84C' }}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs font-light" style={{ color: '#555' }}>✕</button>
          )}
        </div>
      </div>

      {!query ? (
        <div className="px-6 py-6">
          <p className="text-xs font-light mb-5" style={{ color: '#555', letterSpacing: '0.1em' }}>TENDANCES</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setQuery(tag)}
                className="px-4 py-2 text-xs font-light"
                style={{ border: '1px solid #2a2a2a', borderRadius: 2, color: '#777', letterSpacing: '0.05em' }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-4">
          {/* Users */}
          {results.users.length > 0 && (
            <div className="mb-7">
              <p className="text-xs font-light mb-4" style={{ color: '#555', letterSpacing: '0.1em' }}>CRÉATEURS</p>
              <div className="space-y-4">
                {results.users.map(u => (
                  <Link key={u.id} to={`/profile/${u.user_id}`} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-light flex-shrink-0" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#C9A84C' }}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : (u.display_name || u.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-white truncate">{u.display_name || u.username}</p>
                      <p className="text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>@{u.username} · {fmt(u.followers_count)} followers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {results.posts.length > 0 && (
            <div>
              <p className="text-xs font-light mb-4" style={{ color: '#555', letterSpacing: '0.1em' }}>PUBLICATIONS</p>
              <div className="space-y-3">
                {results.posts.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ border: '1px solid #2a2a2a' }}>
                      {p.type === 'vlog' ? <Play size={12} strokeWidth={1} style={{ color: '#C9A84C' }} /> : <Mic size={12} strokeWidth={1} style={{ color: '#C9A84C' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-white truncate">{p.title || p.description?.slice(0, 50) || '—'}</p>
                      <p className="text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>@{p.author_username} · {fmt(p.likes_count)} likes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && results.posts.length === 0 && results.users.length === 0 && (
            <div className="text-center py-16">
              <p className="text-xs font-light" style={{ color: '#444', letterSpacing: '0.08em' }}>AUCUN RÉSULTAT POUR « {query.toUpperCase()} »</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
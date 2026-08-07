import { useState, useEffect } from 'react';
import { getUser, dbFilter } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const me = await getUser().catch(() => null);
      if (!me) { setLoading(false); return; }
      const [myPosts, profile] = await Promise.all([
        dbFilter('posts', { author_id: me.id }, '-created_date', 30),
        dbFilter('profiles', { user_id: me.id }),
      ]);

      const totalLikes = myPosts.reduce((s, p) => s + (p.likes_count || 0), 0);
      const totalViews = myPosts.reduce((s, p) => s + (p.views_count || 0), 0);
      const totalComments = myPosts.reduce((s, p) => s + (p.comments_count || 0), 0);

      setStats({
        totalPosts: myPosts.length,
        totalLikes,
        totalViews,
        totalComments,
        followers: profile?.[0]?.followers_count || 0,
        vlogs: myPosts.filter(p => p.type === 'vlog').length,
        voices: myPosts.filter(p => p.type === 'voice').length,
      });
      setPosts([...myPosts].slice(0, 8).reverse());
      setLoading(false);
    };
    load();
  }, []);

  const chartData = posts.map((p, i) => ({ name: `#${i+1}`, likes: p.likes_count || 0, vues: p.views_count || 0 }));

  const STATS = stats ? [
    { label: 'Publications', value: fmt(stats.totalPosts) },
    { label: 'Followers', value: fmt(stats.followers) },
    { label: 'Likes totaux', value: fmt(stats.totalLikes) },
    { label: 'Vues totales', value: fmt(stats.totalViews) },
  ] : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <Link to="/" style={{ color: '#555' }}>
          <ArrowLeft size={18} strokeWidth={1.2} />
        </Link>
        <p className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.15em' }}>STATISTIQUES</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#C9A84C' }} />
        </div>
      ) : (
        <div className="px-6 py-6 space-y-8">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="py-5 px-4" style={{ border: '1px solid #1e1e1e', borderRadius: 2 }}>
                <div className="text-xl font-light text-white mb-1 text-right tabular-nums">{s.value}</div>
                <div className="text-right text-xs font-light" style={{ color: '#555', fontSize: '10px', letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Content split */}
          {stats && (
            <div>
              <p className="text-xs font-light mb-4" style={{ color: '#555', letterSpacing: '0.1em' }}>TYPE DE CONTENU</p>
              <div className="flex gap-3">
                {[{ label: 'VLOGS', value: stats.vlogs }, { label: 'VOICE POSTS', value: stats.voices }].map(t => (
                  <div key={t.label} className="flex-1 py-4 px-4" style={{ border: '1px solid #1e1e1e', borderRadius: 2 }}>
                    <div className="text-lg font-light text-white text-right mb-1">{t.value}</div>
                    <div className="text-xs font-light text-right" style={{ color: '#555', fontSize: '10px', letterSpacing: '0.1em' }}>{t.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div>
              <p className="text-xs font-light mb-4" style={{ color: '#555', letterSpacing: '0.1em' }}>ENGAGEMENT</p>
              <div style={{ border: '1px solid #1e1e1e', borderRadius: 2, padding: '16px 8px 8px' }}>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} barGap={2}>
                    <XAxis dataKey="name" tick={{ fill: '#444', fontSize: 9, fontWeight: 300 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 9, fontWeight: 300 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 2, fontSize: 11, fontWeight: 300, color: '#aaa' }}
                      cursor={{ fill: 'rgba(201,168,76,0.04)' }}
                    />
                    <Bar dataKey="likes" fill="#C9A84C" opacity={0.7} radius={[1,1,0,0]} barSize={8} />
                    <Bar dataKey="vues" fill="#333333" radius={[1,1,0,0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-5 justify-end mt-2">
                  <div className="flex items-center gap-2 text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>
                    <div className="w-2 h-px" style={{ backgroundColor: '#C9A84C' }} />Likes
                  </div>
                  <div className="flex items-center gap-2 text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>
                    <div className="w-2 h-px" style={{ backgroundColor: '#333' }} />Vues
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top posts */}
          {posts.length > 0 && (
            <div>
              <p className="text-xs font-light mb-4" style={{ color: '#555', letterSpacing: '0.1em' }}>MEILLEURES PUBLICATIONS</p>
              <div className="space-y-3">
                {[...posts].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <span className="text-xs font-light tabular-nums w-4 text-right" style={{ color: '#333' }}>0{i+1}</span>
                    <div className="flex-1">
                      <p className="text-xs font-light text-white truncate mb-0.5">{p.title || p.description?.slice(0, 40) || '—'}</p>
                      <p className="text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>{p.type === 'vlog' ? 'VLOG' : 'VOICE'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-light tabular-nums" style={{ color: '#C9A84C', fontSize: '11px' }}>{fmt(p.likes_count)}</p>
                      <p className="text-xs font-light" style={{ color: '#444', fontSize: '10px' }}>likes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
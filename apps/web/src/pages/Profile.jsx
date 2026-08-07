import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUser, dbFilter, dbUpdate, dbCreate, dbDelete, findOrCreateConversation, createNotification } from '@/lib/db';
import { Settings, Play, Mic, Loader2, Globe, MapPin, MessageCircle, BadgeCheck } from 'lucide-react';
import CoverPhoto from '@/components/profils/CoverPhoto';
import AvatarPhoto from '@/components/profils/AvatarPhoto';
import FriendSuggestions from '@/components/profils/FriendSuggestions';

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vlogs');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const me = await getUser().catch(() => null);
      setCurrentUser(me);
      const targetId = userId || me?.id;
      if (!targetId) { setLoading(false); return; }
      const [profiles, userPosts] = await Promise.all([
        dbFilter('profiles', { user_id: targetId }),
        dbFilter('posts', { author_id: targetId }, '-created_date', 30),
      ]);
      setProfile(profiles[0] || null);
      setPosts(userPosts);
      if (me && targetId !== me.id) {
        const follows = await dbFilter('follows', { follower_id: me.id, following_id: targetId });
        setIsFollowing(follows.length > 0);
      }
      setLoading(false);
    };
    init();
  }, [userId]);

  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetId = userId || currentUser?.id;

  const saveProfile = async (patch) => {
    if (!profile) return;
    const updated = { ...profile, ...patch };
    setProfile(updated);
    await dbUpdate('profiles', profile.id, patch).catch(() => {});
  };

  const handleAvatarUpdate = (url) => saveProfile({ avatar_url: url });
  const handleBannerUpdate = (url) => saveProfile({ banner_url: url });

  const toggleFollow = async () => {
    if (!currentUser || isOwnProfile || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      const follows = await dbFilter('follows', { follower_id: currentUser.id, following_id: targetId });
      if (follows[0]) await dbDelete('follows', follows[0].id);
      setIsFollowing(false);
      setProfile(p => p ? { ...p, followers_count: Math.max(0, (p.followers_count || 1) - 1) } : p);
    } else {
      await dbCreate('follows', { follower_id: currentUser.id, following_id: targetId });
      setIsFollowing(true);
      setProfile(p => p ? { ...p, followers_count: (p.followers_count || 0) + 1 } : p);
      // notification
      await createNotification({
        userId: targetId,
        actorId: currentUser.id,
        actorName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
        actorAvatar: profile?.avatar_url || null,
        type: 'follow',
      }).catch(() => {});
    }
    setFollowLoading(false);
  };

  const startConversation = async () => {
    if (!currentUser || isOwnProfile) return;
    const conv = await findOrCreateConversation(
      currentUser.id, targetId,
      currentUser.user_metadata?.full_name || 'Moi',
      profile
    ).catch(() => null);
    if (conv) navigate('/messages');
  };

  const filteredPosts = posts.filter(p => activeTab === 'vlogs' ? p.type === 'vlog' : p.type === 'voice');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#111' }}>
        <Loader2 size={20} strokeWidth={1} style={{ color: '#C9A84C' }} className="animate-spin" />
      </div>
    );
  }

  const name = profile?.display_name || currentUser?.full_name || 'Vloger';
  const username = profile?.username || currentUser?.email?.split('@')[0] || 'user';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Cover photo */}
      <CoverPhoto
        bannerUrl={profile?.banner_url}
        isOwn={isOwnProfile}
        onUpdate={handleBannerUpdate}
      />

      {/* Profile header */}
      <div className="px-6 -mt-10 pb-5">
        <div className="flex items-end justify-between mb-4">
          <AvatarPhoto
            avatarUrl={profile?.avatar_url}
            name={name}
            size={72}
            isOwn={isOwnProfile}
            onUpdate={handleAvatarUpdate}
            uploading={uploading}
            setUploading={setUploading}
          />

          <div className="flex items-center gap-2 mb-1">
            {isOwnProfile ? (
              <>
                <Link
                  to="/settings"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-light"
                  style={{ border: '1px solid #2a2a2a', color: '#666', letterSpacing: '0.08em' }}
                >
                  <Settings size={11} strokeWidth={1.2} />
                  MODIFIER
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={startConversation}
                  className="p-2.5"
                  style={{ border: '1px solid #2a2a2a', color: '#666' }}
                >
                  <MessageCircle size={14} strokeWidth={1.2} />
                </button>
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className="px-5 py-2 text-xs font-light"
                  style={{
                    border: `1px solid ${isFollowing ? '#2a2a2a' : '#C9A84C55'}`,
                    backgroundColor: isFollowing ? 'transparent' : '#C9A84C15',
                    color: isFollowing ? '#555' : '#C9A84C',
                    letterSpacing: '0.08em',
                    opacity: followLoading ? 0.5 : 1,
                  }}
                >
                  {isFollowing ? 'ABONNÉ' : 'SUIVRE'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name & username */}
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-base font-light text-white" style={{ letterSpacing: '0.01em' }}>{name}</h2>
          {profile?.verified && <BadgeCheck size={14} style={{ color: '#C9A84C' }} />}
        </div>
        <p className="text-xs font-light mb-2" style={{ color: '#555' }}>@{username}</p>

        {profile?.bio && (
          <p className="text-xs font-light leading-relaxed mb-3" style={{ color: '#777', maxWidth: 280 }}>{profile.bio}</p>
        )}

        {/* Location / website */}
        <div className="flex items-center gap-4 mb-4">
          {(profile?.city || profile?.country) && (
            <div className="flex items-center gap-1">
              <MapPin size={10} strokeWidth={1} style={{ color: '#555' }} />
              <span className="text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {profile?.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1">
              <Globe size={10} strokeWidth={1} style={{ color: '#C9A84C' }} />
              <span className="text-xs font-light" style={{ color: '#C9A84C', fontSize: '10px' }}>
                {profile.website.replace(/^https?:\/\//, '')}
              </span>
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          {[
            { label: 'Posts', value: fmt(posts.length) },
            { label: 'Followers', value: fmt(profile?.followers_count) },
            { label: 'Suivis', value: fmt(profile?.following_count) },
            { label: 'Likes', value: fmt(profile?.likes_received) },
          ].map(s => (
            <div key={s.label}>
              <div className="text-sm font-light text-white tabular-nums">{s.value}</div>
              <div className="text-xs font-light" style={{ color: '#555', fontSize: '10px', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Friend suggestions (own profile only) */}
      {isOwnProfile && <FriendSuggestions currentUserId={currentUser?.id} />}

      {/* Tabs */}
      <div className="flex px-6" style={{ borderBottom: '1px solid #1a1a1a' }}>
        {[
          { key: 'vlogs', label: 'VLOGS', El: Play },
          { key: 'voice', label: 'VOICE', El: Mic },
        ].map(({ key, El, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 pr-7 py-3 text-xs font-light tracking-wider relative"
            style={{ color: activeTab === key ? '#ffffff' : '#444', letterSpacing: '0.08em' }}
          >
            <El size={12} strokeWidth={1} />
            {label}
            {activeTab === key && <span className="absolute bottom-0 left-0 right-7 h-px" style={{ backgroundColor: '#C9A84C' }} />}
          </button>
        ))}
      </div>

      {/* Content grid */}
      {activeTab === 'vlogs' ? (
        filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xs font-light" style={{ color: '#333', letterSpacing: '0.08em' }}>AUCUN VLOG</p>
            {isOwnProfile && (
              <Link to="/create/vlog" className="block mt-4 text-xs font-light" style={{ color: '#C9A84C' }}>
                Publier mon premier vlog →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: '#1a1a1a' }}>
            {filteredPosts.map(p => (
              <div key={p.id} className="relative" style={{ aspectRatio: '16/9', backgroundColor: '#111' }}>
                {p.thumbnail_url ? (
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(0.65)' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
                    <Play size={16} strokeWidth={1} style={{ color: '#333' }} />
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(201,168,76,0.18) 0%, transparent 55%)' }} />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                  <span className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px' }}>{p.title}</span>
                  <span className="text-xs font-light tabular-nums flex-shrink-0" style={{ color: '#C9A84C', fontSize: '9px' }}>{fmt(p.likes_count)}♡</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xs font-light" style={{ color: '#333', letterSpacing: '0.08em' }}>AUCUN VOICE POST</p>
            {isOwnProfile && (
              <Link to="/create/voice" className="block mt-4 text-xs font-light" style={{ color: '#C9A84C' }}>
                Enregistrer mon premier voice →
              </Link>
            )}
          </div>
        ) : (
          <div>
            {filteredPosts.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1a1a1a', border: '1px solid #C9A84C22' }}>
                  <Mic size={14} strokeWidth={1} style={{ color: '#C9A84C' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-light text-white truncate">{p.title || 'Voice Post'}</p>
                  <p className="text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>
                    {fmt(p.views_count)} écoutes · {fmt(p.likes_count)} likes
                    {p.duration ? ` · ${Math.floor(p.duration / 60)}:${String(p.duration % 60).padStart(2, '0')}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
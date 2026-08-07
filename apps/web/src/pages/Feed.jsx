import { useState, useEffect, useRef } from 'react';
import { getUser, dbList, dbFilter, toggleLike, getLikeStatus, dbUpdate, createNotification } from '@/lib/db';
import { Heart, MessageCircle, Share2, Bookmark, Play, Mic } from 'lucide-react';
import CommentsSheet from '@/components/CommentsSheet';
import { useShare } from '@/hooks/useShare';

const TABS = ['Pour vous', 'Abonnements', 'Tendances'];

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

/** @param {string} d */
const ago = (d) => {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}j`;
};

// Notifie l'auteur du post lors d'un like (jamais sur soi-même, jamais au unlike)
const notifyLike = (post, currentUser) => {
  if (!post.author_id || post.author_id === currentUser.id) return;
  createNotification({
    userId: post.author_id,
    actorId: currentUser.id,
    actorName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
    type: 'like',
    postId: post.id,
    postThumbnail: post.thumbnail_url || null,
  }).catch(() => {});
};

function VlogCard({ post, currentUser, onOpenComments }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [playing, setPlaying] = useState(false);
  const [liking, setLiking] = useState(false);
  const videoRef = useRef(null);
  const { share, shared } = useShare();

  const handleShare = async () => {
    const prev = sharesCount;
    setSharesCount(c => c + 1);
    await share(post).catch(() => setSharesCount(prev));
  };

  useEffect(() => {
    if (currentUser) {
      getLikeStatus(post.id, currentUser.id).then(setLiked).catch(() => {});
    }
  }, [post.id, currentUser?.id]);

  const handleLike = async () => {
    if (!currentUser || liking) return;
    setLiking(true);
    const nowLiked = await toggleLike(post.id, currentUser.id).catch(() => null);
    if (nowLiked !== null) {
      setLiked(nowLiked);
      setLikesCount(c => nowLiked ? c + 1 : Math.max(0, c - 1));
      if (nowLiked) notifyLike(post, currentUser);
    }
    setLiking(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else {
      videoRef.current.play();
      setPlaying(true);
      dbUpdate('posts', post.id, { views_count: (post.views_count || 0) + 1 }).catch(() => {});
    }
  };

  return (
    <article className="mb-10">
      <div className="flex items-center justify-between px-6 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-light overflow-hidden" style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#C9A84C' }}>
            {post.author_avatar
              ? <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
              : (post.author_name || 'V')[0]}
          </div>
          <div>
            <p className="text-xs font-light tracking-wide" style={{ color: '#ffffff' }}>{post.author_name}</p>
            <p className="text-xs font-light" style={{ color: '#555', fontSize: '10px' }}>@{post.author_username} · {ago(post.created_date)}</p>
          </div>
        </div>
        <p className="text-xs font-light tabular-nums" style={{ color: '#555', fontSize: '10px', letterSpacing: '0.05em' }}>
          {fmt(post.views_count)} vues
        </p>
      </div>

      <div className="relative mx-6 overflow-hidden" style={{ aspectRatio: '16/9', borderRadius: 2 }}>
        {post.video_url ? (
          <>
            <video
              ref={videoRef}
              src={post.video_url}
              poster={post.thumbnail_url || undefined}
              className="w-full h-full object-cover"
              playsInline
              preload="metadata"
              onEnded={() => setPlaying(false)}
            />
            {!playing && (
              <>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(201,168,76,0.18) 0%, transparent 50%)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)', border: '1px solid rgba(201,168,76,0.4)' }}>
                    <Play size={16} strokeWidth={1} style={{ color: '#C9A84C', marginLeft: 2 }} fill="#C9A84C" />
                  </div>
                </div>
              </>
            )}
            <button className="absolute inset-0 w-full h-full" onClick={togglePlay} style={{ background: 'transparent' }} />
          </>
        ) : post.thumbnail_url ? (
          <>
            <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.88)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(201,168,76,0.18) 0%, transparent 50%)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)', border: '1px solid rgba(201,168,76,0.4)' }}>
                <Play size={16} strokeWidth={1} style={{ color: '#C9A84C', marginLeft: 2 }} fill="#C9A84C" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
            <Play size={24} strokeWidth={1} style={{ color: '#333' }} />
          </div>
        )}
        {post.duration && !playing && (
          <span className="absolute bottom-2.5 right-3 text-xs font-light tabular-nums" style={{ color: '#C9A84C', fontSize: '10px', letterSpacing: '0.05em' }}>
            {Math.floor(post.duration / 60)}:{String(post.duration % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      {(post.title || post.description) && (
        <div className="px-6 mt-3 mb-3">
          {post.title && <p className="text-sm font-light text-white mb-0.5" style={{ letterSpacing: '0.01em' }}>{post.title}</p>}
          {post.description && <p className="text-xs font-light" style={{ color: '#666' }}>{post.description}</p>}
          {post.hashtags?.length > 0 && (
            <p className="text-xs font-light mt-1" style={{ color: '#C9A84C', opacity: 0.7 }}>
              {post.hashtags.map(t => `#${t}`).join(' ')}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="flex items-center gap-1.5">
            <Heart size={16} strokeWidth={1.2} style={{ color: liked ? '#C9A84C' : '#444' }} fill={liked ? '#C9A84C' : 'none'} />
            <span className="text-xs font-light tabular-nums" style={{ color: '#666', fontSize: '11px' }}>{fmt(likesCount)}</span>
          </button>
          <button onClick={() => onOpenComments(post)} className="flex items-center gap-1.5">
            <MessageCircle size={16} strokeWidth={1.2} style={{ color: '#444' }} />
            <span className="text-xs font-light tabular-nums" style={{ color: '#666', fontSize: '11px' }}>{fmt(post.comments_count)}</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5">
            <Share2 size={16} strokeWidth={1.2} style={{ color: shared ? '#C9A84C' : '#444' }} />
            <span className="text-xs font-light tabular-nums" style={{ color: shared ? '#C9A84C' : '#666', fontSize: '11px' }}>{fmt(sharesCount)}</span>
          </button>
        </div>
        <button onClick={() => setSaved(s => !s)}>
          <Bookmark size={16} strokeWidth={1.2} style={{ color: saved ? '#C9A84C' : '#444' }} fill={saved ? '#C9A84C' : 'none'} />
        </button>
      </div>
    </article>
  );
}

function VoiceCard({ post, currentUser, onOpenComments }) {
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [liking, setLiking] = useState(false);
  const audioRef = useRef(null);
  const { share, shared } = useShare();

  const handleShare = async () => {
    const prev = sharesCount;
    setSharesCount(c => c + 1);
    await share(post).catch(() => setSharesCount(prev));
  };

  useEffect(() => {
    if (currentUser) {
      getLikeStatus(post.id, currentUser.id).then(setLiked).catch(() => {});
    }
  }, [post.id, currentUser?.id]);

  const handleLike = async () => {
    if (!currentUser || liking) return;
    setLiking(true);
    const nowLiked = await toggleLike(post.id, currentUser.id).catch(() => null);
    if (nowLiked !== null) {
      setLiked(nowLiked);
      setLikesCount(c => nowLiked ? c + 1 : Math.max(0, c - 1));
      if (nowLiked) notifyLike(post, currentUser);
    }
    setLiking(false);
  };

  const togglePlay = () => {
    if (post.audio_url && audioRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    }
  };

  return (
    <article className="mb-10 mx-6">
      {post.audio_url && (
        <audio ref={audioRef} src={post.audio_url} preload="metadata" onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
      )}
      <div className="rounded overflow-hidden" style={{ border: '1px solid #1e1e1e' }}>
        <div className="p-5" style={{ backgroundColor: '#161616' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs overflow-hidden" style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#C9A84C' }}>
                {post.author_avatar
                  ? <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
                  : (post.author_name || 'V')[0]}
              </div>
              <div>
                <p className="text-xs font-light text-white">{post.author_name}</p>
                <p style={{ color: '#555', fontSize: '10px' }}>@{post.author_username} · {ago(post.created_date)}</p>
              </div>
            </div>
            <Mic size={14} strokeWidth={1} style={{ color: '#C9A84C', opacity: 0.6 }} />
          </div>

          {post.title && <p className="text-sm font-light text-white mb-1">{post.title}</p>}
          {post.description && <p className="text-xs font-light mb-4" style={{ color: '#555' }}>{post.description}</p>}

          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={togglePlay}
              disabled={!post.audio_url}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: '1px solid #C9A84C44', backgroundColor: '#1a1a1a', opacity: post.audio_url ? 1 : 0.4 }}
            >
              {playing
                ? <span style={{ width: 8, height: 8, display: 'flex', gap: 2 }}>
                    <span style={{ width: 2, height: 8, backgroundColor: '#C9A84C', borderRadius: 1 }} />
                    <span style={{ width: 2, height: 8, backgroundColor: '#C9A84C', borderRadius: 1 }} />
                  </span>
                : <Play size={10} strokeWidth={1} fill="#C9A84C" style={{ color: '#C9A84C', marginLeft: 1 }} />
              }
            </button>
            <div className="flex items-end gap-px flex-1" style={{ height: 36 }}>
              {[...Array(36)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    height: `${20 + Math.sin(i * 0.7) * 60 + Math.cos(i * 1.3) * 30}%`,
                    backgroundColor: playing && i < 14 ? '#C9A84C' : '#2a2a2a',
                    transition: 'background-color 0.2s',
                    minHeight: 2,
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
            {post.duration && (
              <span className="text-xs font-light tabular-nums flex-shrink-0" style={{ color: '#555', fontSize: '10px' }}>
                {Math.floor(post.duration / 60)}:{String(post.duration % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #1e1e1e' }}>
          <div className="flex items-center gap-5">
            <button onClick={handleLike} className="flex items-center gap-1.5">
              <Heart size={14} strokeWidth={1.2} style={{ color: liked ? '#C9A84C' : '#444' }} fill={liked ? '#C9A84C' : 'none'} />
              <span className="text-xs font-light tabular-nums" style={{ color: '#666', fontSize: '11px' }}>{fmt(likesCount)}</span>
            </button>
            <button onClick={() => onOpenComments(post)} className="flex items-center gap-1.5">
              <MessageCircle size={14} strokeWidth={1.2} style={{ color: '#444' }} />
              <span className="text-xs font-light tabular-nums" style={{ color: '#666', fontSize: '11px' }}>{fmt(post.comments_count)}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-1.5">
              <Share2 size={14} strokeWidth={1.2} style={{ color: shared ? '#C9A84C' : '#444' }} />
              <span className="text-xs font-light tabular-nums" style={{ color: shared ? '#C9A84C' : '#666', fontSize: '11px' }}>{fmt(sharesCount)}</span>
            </button>
          </div>
          <p className="text-xs font-light tabular-nums" style={{ color: '#555', fontSize: '10px' }}>{fmt(post.views_count)} écoutes</p>
        </div>
      </div>
    </article>
  );
}

export default function Feed() {
  const [activeTab, setActiveTab] = useState(0);
  const [allPosts, setAllPosts] = useState(/** @type {any[]} */ ([]));
  const [followingPosts, setFollowingPosts] = useState(/** @type {any[]} */ ([]));
  const [currentUser, setCurrentUser] = useState(null);
  const [commentPost, setCommentPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const me = await getUser().catch(() => null);
      setCurrentUser(me);

      const posts = await dbList('posts', '-created_date', 30).catch(() => []);
      setAllPosts(posts);

      if (me) {
        const follows = await dbFilter('follows', { follower_id: me.id }).catch(() => []);
        const followingIds = follows.map(f => f.following_id);
        if (followingIds.length > 0) {
          setFollowingPosts(posts.filter(p => followingIds.includes(p.author_id)));
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const displayedPosts = activeTab === 0
    ? allPosts
    : activeTab === 1
      ? followingPosts
      : [...allPosts].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));

  const emptyMessages = ['AUCUNE PUBLICATION', 'AUCUN ABONNEMENT', 'AUCUNE TENDANCE'];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      <div className="flex gap-7 px-6 py-3 mb-2" style={{ borderBottom: '1px solid #1a1a1a' }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className="pb-2 text-xs font-light tracking-wider relative"
            style={{ color: activeTab === i ? '#ffffff' : '#444', letterSpacing: '0.06em' }}
          >
            {tab}
            {activeTab === i && (
              <span className="absolute bottom-0 left-0 right-0 h-px" style={{ backgroundColor: '#C9A84C' }} />
            )}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xs font-light" style={{ color: '#333', letterSpacing: '0.08em' }}>{emptyMessages[activeTab]}</p>
          </div>
        ) : (
          displayedPosts.map(post =>
            post.type === 'vlog'
              ? <VlogCard key={post.id} post={post} currentUser={currentUser} onOpenComments={setCommentPost} />
              : <VoiceCard key={post.id} post={post} currentUser={currentUser} onOpenComments={setCommentPost} />
          )
        )}
      </div>

      {commentPost && (
        <CommentsSheet
          post={commentPost}
          currentUser={currentUser}
          onClose={() => setCommentPost(null)}
          onRefresh={() => {}}
        />
      )}
    </div>
  );
}
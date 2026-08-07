import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Play, Mic, BadgeCheck, Volume2 } from 'lucide-react';
import CommentsSheet from '@/components/CommentsSheet';
import { useShare } from '@/hooks/useShare';

export default function PostCard({ post, currentUser, onLike, onRefresh }) {
  const [showComments, setShowComments] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState(null);
  const { share, shared } = useShare();

  const toggleAudio = () => {
    if (!post.audio_url) return;
    if (audioEl) {
      if (audioPlaying) {
        audioEl.pause();
        setAudioPlaying(false);
      } else {
        audioEl.play();
        setAudioPlaying(true);
      }
    } else {
      const a = new Audio(post.audio_url);
      a.play();
      a.onended = () => setAudioPlaying(false);
      setAudioEl(a);
      setAudioPlaying(true);
    }
  };

  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  /** @param {string} date */
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'À l\'instant';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}j`;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <div className="p-4 hover:bg-white/2 transition-colors">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Link to={`/profile/${post.author_id}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
              {post.author_avatar ? (
                <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {(post.author_name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link to={`/profile/${post.author_id}`} className="font-semibold text-white text-sm hover:underline truncate">
                {post.author_name || 'Vloger'}
              </Link>
              {post.author_verified && <BadgeCheck size={14} className="text-purple-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span>@{post.author_username || 'user'}</span>
              <span>·</span>
              <span>{timeAgo(post.created_date)}</span>
              <span>·</span>
              {post.type === 'vlog' ? (
                <span className="flex items-center gap-0.5 text-purple-400"><Play size={10} />Vlog</span>
              ) : (
                <span className="flex items-center gap-0.5 text-pink-400"><Mic size={10} />Voice</span>
              )}
            </div>
          </div>
          <button className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Content */}
        {post.title && (
          <p className="text-white font-medium text-sm mb-2">{post.title}</p>
        )}
        {post.description && (
          <p className="text-white/70 text-sm mb-3 leading-relaxed">
            {post.description}
            {post.hashtags?.map(h => (
              <span key={h} className="text-purple-400 ml-1">#{h}</span>
            ))}
          </p>
        )}

        {/* Media */}
        {post.type === 'vlog' && (
          <div className="rounded-2xl overflow-hidden mb-3 bg-black/40 aspect-video relative group">
            {post.thumbnail_url || post.video_url ? (
              <>
                <img
                  src={post.thumbnail_url || `https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=225&fit=crop`}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={20} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play size={32} className="text-white/30" />
              </div>
            )}
          </div>
        )}

        {post.type === 'voice' && (
          <div
            className="rounded-2xl p-4 mb-3 bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/20 cursor-pointer"
            onClick={toggleAudio}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${audioPlaying ? 'bg-pink-500 animate-pulse' : 'bg-pink-500/30'}`}>
                {audioPlaying ? <Volume2 size={18} className="text-white" /> : <Mic size={18} className="text-pink-400" />}
              </div>
              <div className="flex-1">
                <div className="flex items-end gap-0.5 h-8">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full ${audioPlaying ? 'bg-pink-400 animate-pulse' : 'bg-pink-400/40'}`}
                      style={{ height: `${20 + Math.sin(i * 0.8) * 50}%` }}
                    />
                  ))}
                </div>
              </div>
              {post.duration && <span className="text-white/50 text-xs">{Math.floor(post.duration / 60)}:{String(post.duration % 60).padStart(2, '0')}</span>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-5">
            <button
              onClick={() => onLike && onLike(post)}
              className={`flex items-center gap-1.5 text-sm transition-all ${post.liked ? 'text-pink-400' : 'text-white/40 hover:text-pink-400'}`}
            >
              <Heart size={18} fill={post.liked ? 'currentColor' : 'none'} />
              <span className="text-xs font-medium">{formatCount(post.likes_count)}</span>
            </button>
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1.5 text-white/40 hover:text-purple-400 text-sm transition-colors"
            >
              <MessageCircle size={18} />
              <span className="text-xs font-medium">{formatCount(post.comments_count)}</span>
            </button>
            <button
              onClick={() => share(post)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${shared ? 'text-yellow-400' : 'text-white/40 hover:text-blue-400'}`}
            >
              <Share2 size={18} />
              <span className="text-xs font-medium">{shared ? 'Copié !' : formatCount(post.shares_count)}</span>
            </button>
          </div>
          <button className="text-white/30 hover:text-yellow-400 transition-colors">
            <Bookmark size={18} />
          </button>
        </div>
      </div>

      {showComments && (
        <CommentsSheet
          post={post}
          currentUser={currentUser}
          onClose={() => setShowComments(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { dbFilter, dbCreate, createNotification } from '@/lib/db';

export default function CommentsSheet({ post, currentUser, onClose, onRefresh }) {
  // eslint-disable-next-line no-unused-vars
  const _typeFix = undefined;

  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadComments(); }, []);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await dbFilter('comments', { post_id: post.id }, '-created_date', 50);
      setComments(data);
    } catch { setComments([]); }
    setLoading(false);
  };

  const submitComment = async () => {
    if (!text.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await dbCreate('comments', {
        post_id: post.id,
        author_id: currentUser.id,
        author_name: currentUser.full_name || 'Vloger',
        author_username: currentUser.email?.split('@')[0] || 'user',
        content: text.trim(),
        type: 'text',
      });
      // comments_count géré par trigger DB, mais on met à jour localement
      setText('');
      loadComments();
      // notification à l'auteur du post
      if (post.author_id && post.author_id !== currentUser.id) {
        await createNotification({
          userId: post.author_id,
          actorId: currentUser.id,
          actorName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
          type: 'comment',
          postId: post.id,
          postThumbnail: post.thumbnail_url || null,
        }).catch(() => {});
      }
      onRefresh && onRefresh();
    } catch {}
    setSubmitting(false);
  };

  /** @param {string} date */
  const timeAgo = (date) => {
    const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (m < 1) return 'maintenant';
    if (m < 60) return `${m}m`;
    if (m < 1440) return `${Math.floor(m / 60)}h`;
    return `${Math.floor(m / 1440)}j`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto flex flex-col"
        style={{ maxHeight: '75vh', backgroundColor: '#161616', borderTop: '1px solid #2a2a2a' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1e1e1e' }}>
          <p className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.12em' }}>COMMENTAIRES</p>
          <button onClick={onClose} style={{ color: '#555' }}>
            <X size={16} strokeWidth={1.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <p className="text-center text-xs font-light py-8" style={{ color: '#444' }}>Chargement...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs font-light py-8" style={{ color: '#444' }}>Aucun commentaire. Sois le premier.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs" style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#C9A84C' }}>
                  {(c.author_name || 'V')[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-light text-white">{c.author_name}</span>
                    <span className="text-xs font-light" style={{ color: '#444', fontSize: '10px' }}>{timeAgo(c.created_date)}</span>
                  </div>
                  <p className="text-xs font-light" style={{ color: '#888', lineHeight: 1.6 }}>{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 flex gap-3 items-center" style={{ borderTop: '1px solid #1e1e1e' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitComment()}
            placeholder="Ajouter un commentaire..."
            className="flex-1 text-xs font-light text-white outline-none py-2.5"
            style={{ backgroundColor: 'transparent', borderBottom: '1px solid #2a2a2a', color: '#aaa', caretColor: '#C9A84C' }}
          />
          <button
            onClick={submitComment}
            disabled={!text.trim() || submitting}
            style={{ color: text.trim() ? '#C9A84C' : '#333', opacity: submitting ? 0.5 : 1 }}
          >
            <Send size={15} strokeWidth={1.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
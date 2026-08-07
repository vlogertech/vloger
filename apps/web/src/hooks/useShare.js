import { useState } from 'react';
import { dbUpdate } from '@/lib/db';

export function useShare() {
  const [shared, setShared] = useState(false);

  const share = async (post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    const data = {
      title: post.title || 'VLOGER',
      text: post.description || `${post.author_name} sur VLOGER`,
      url,
    };

    try {
      if (navigator.share && navigator.canShare?.(data)) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
      // incrémenter shares_count
      dbUpdate('posts', post.id, { shares_count: (post.shares_count || 0) + 1 }).catch(() => {});
    } catch (err) {
      if (err.name !== 'AbortError') {
        // fallback silencieux
        navigator.clipboard.writeText(url).catch(() => {});
      }
    }
  };

  return { share, shared };
}

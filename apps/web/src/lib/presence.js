import { supabase } from '@/lib/supabase';

let channel = null;
let currentUserId = null;
let subscribed = false;

const ensureChannel = () => {
  if (!channel) {
    channel = supabase.channel('vloger:presence', {
      config: { presence: { key: 'user_id' } },
    });
    subscribed = false;
  }
  return channel;
};

// Appelé UNE SEULE FOIS par usePresence — attache listeners puis subscribe
export const initPresenceChannel = (onSync) => {
  const ch = ensureChannel();
  if (subscribed) {
    // Canal déjà souscrit, sync immédiat
    onSync();
    return ch;
  }
  subscribed = true;
  ch.on('presence', { event: 'sync' }, onSync)
    .on('presence', { event: 'join' }, onSync)
    .on('presence', { event: 'leave' }, onSync)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED' && currentUserId) {
        ch.track({ user_id: currentUserId, online_at: new Date().toISOString() });
      }
    });
  return ch;
};

// Appelé par AuthContext au login
export const joinPresence = (userId) => {
  currentUserId = userId;
  if (channel?.state === 'joined') {
    channel.track({ user_id: userId, online_at: new Date().toISOString() });
  }
  // Sinon le track se fera dans le callback subscribe de initPresenceChannel
};

// Appelé par AuthContext au logout
export const leavePresence = async () => {
  currentUserId = null;
  if (channel) {
    try { await channel.untrack(); } catch {}
    try { await supabase.removeChannel(channel); } catch {}
    channel = null;
  }
};

export const getOnlineUsers = () => {
  if (!channel) return new Set();
  const state = channel.presenceState();
  return new Set(Object.values(state).flat().map((p) => p.user_id));
};

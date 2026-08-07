import { useEffect, useState } from 'react';
import { initPresenceChannel, getOnlineUsers } from '@/lib/presence';

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    let isMounted = true;

    const sync = () => {
      if (isMounted) setOnlineUsers(new Set(getOnlineUsers()));
    };

    const ch = initPresenceChannel(sync);

    return () => {
      isMounted = false;
      // Canal global — ne pas le détruire ici
    };
  }, []);

  return { onlineUsers, isOnline: (userId) => onlineUsers.has(userId) };
}

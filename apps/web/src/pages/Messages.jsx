import { useState, useEffect, useRef, useCallback } from 'react';
import { getUser, dbList, dbFilter, dbCreate, dbUpdate } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { subscribeToMessages } from '@/lib/realtime';
import { usePresence } from '@/hooks/usePresence';
import { ArrowLeft, Send, Plus, Loader2, Mic, Image, Square, CheckCheck, Search, X } from 'lucide-react';
import FriendSuggestions from '@/components/profils/FriendSuggestions';

/** @param {string} date */
const fmtTime = (date) => {
  if (!date) return '';
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return 'maintenant';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/** @param {string} date */
const fmtFull = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

function OnlineDot({ online, size = 8 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: online ? '#22c55e' : '#333',
        border: `1.5px solid #111111`,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

function Avatar({ name, url, size = 36, online }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center overflow-hidden w-full h-full"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#C9A84C', fontSize: size * 0.28, fontWeight: 200 }}
      >
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (name || 'U')[0].toUpperCase()}
      </div>
      {online !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: '50%',
            backgroundColor: online ? '#22c55e' : '#333',
            border: '1.5px solid #111111',
          }}
        />
      )}
    </div>
  );
}

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isOnline } = usePresence();

  useEffect(() => {
    getUser()
      .then(me => { setCurrentUser(me); if (me) loadConvs(me); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected || !currentUser) return;
    loadMsgs(selected.id);
    const unsub = subscribeToMessages(selected.id, (msg) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
    return () => { unsub(); };
  }, [selected?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConvs = async (me) => {
    setLoading(true);
    const all = await dbList('conversations', '-updated_date', 30).catch(() => []);
    setConversations(all.filter(c => c.participant_ids?.includes(me.id)));
    setLoading(false);
  };

  const loadMsgs = async (id) => {
    const msgs = await dbFilter('messages', { conversation_id: id }, 'created_date', 100).catch(() => []);
    setMessages(msgs);
    await dbUpdate('conversations', id, { unread_count: 0 }).catch(() => {});
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
  };

  const send = async (content, type = 'text', extra = {}) => {
    if (!currentUser || !selected) return;
    setSending(true);
    const msg = await dbCreate('messages', {
      conversation_id: selected.id,
      sender_id: currentUser.id,
      sender_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Moi',
      content: content || '',
      type,
      ...extra,
    }).catch(() => null);
    if (msg) setMessages(prev => [...prev, msg]);
    const preview = type === 'text' ? content : type === 'voice' ? '🎤 Voice message' : '📷 Photo';
    await dbUpdate('conversations', selected.id, {
      last_message: preview,
      last_message_time: new Date().toISOString(),
    }).catch(() => {});
    setConversations(prev => prev.map(c =>
      c.id === selected.id ? { ...c, last_message: preview, last_message_time: new Date().toISOString() } : c
    ));
    setSending(false);
  };

  const sendText = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    await send(content, 'text');
  };

  const sendImage = async (file) => {
    const url = await uploadFile(file);
    await send('', 'image', { image_url: url });
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
      const url = await uploadFile(file);
      await send('', 'voice', { audio_url: url, duration: recordingTime });
      setRecordingTime(0);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const getOther = useCallback((conv) => {
    if (!currentUser || !conv.participant_ids) return { name: 'Utilisateur', avatar: null, userId: null };
    const idx = conv.participant_ids.findIndex(id => id !== currentUser.id);
    return {
      name: conv.is_group ? conv.group_name : (conv.participant_names?.[idx] || 'Utilisateur'),
      avatar: conv.is_group ? conv.group_avatar : (conv.participant_avatars?.[idx] || null),
      userId: conv.participant_ids[idx] || null,
    };
  }, [currentUser]);

  const filtered = conversations.filter(c => {
    if (!searchQuery) return true;
    return getOther(c).name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ── Chat view ──
  if (selected) {
    const o = getOther(selected);
    const online = o.userId ? isOnline(o.userId) : false;

    return (
      <div className="flex flex-col h-screen" style={{ backgroundColor: '#111111' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: '#111111' }}>
          <button onClick={() => setSelected(null)} style={{ color: '#555' }}>
            <ArrowLeft size={16} strokeWidth={1.2} />
          </button>
          <Avatar name={o.name} url={o.avatar} size={34} online={online} />
          <div className="flex-1">
            <p className="text-sm font-light text-white">{o.name}</p>
            <div className="flex items-center gap-1.5">
              <OnlineDot online={online} size={6} />
              <p className="text-xs font-light" style={{ color: online ? '#22c55e' : '#555', fontSize: '10px' }}>
                {online ? 'En ligne' : 'Hors ligne'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" style={{ paddingBottom: 80 }}>
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === currentUser?.id;
            const showTime = i === 0 || (new Date(msg.created_date).getTime() - new Date(messages[i - 1]?.created_date).getTime()) > 300000;
            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="text-center py-2">
                    <span className="text-xs font-light" style={{ color: '#333', fontSize: '10px' }}>{fmtFull(msg.created_date)}</span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isMe && <Avatar name={o.name} url={o.avatar} size={24} />}
                  <div style={{ maxWidth: '72%' }}>
                    {msg.type === 'image' && msg.image_url ? (
                      <div style={{ borderRadius: 2, overflow: 'hidden', maxWidth: 200 }}>
                        <img src={msg.image_url} alt="" className="w-full object-cover" style={{ filter: 'brightness(0.9)' }} />
                      </div>
                    ) : msg.type === 'voice' && msg.audio_url ? (
                      <div
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ backgroundColor: isMe ? '#C9A84C' : '#1a1a1a', borderRadius: 2, minWidth: 150 }}
                      >
                        <Mic size={13} strokeWidth={1} style={{ color: isMe ? '#111' : '#C9A84C', flexShrink: 0 }} />
                        <div className="flex items-end gap-0.5 flex-1 h-6">
                          {[...Array(16)].map((_, j) => (
                            <div key={j} style={{ flex: 1, height: `${20 + Math.sin(j * 0.9) * 70}%`, backgroundColor: isMe ? 'rgba(17,17,17,0.5)' : '#2a2a2a', borderRadius: 1 }} />
                          ))}
                        </div>
                        {msg.duration && (
                          <span style={{ fontSize: '9px', color: isMe ? '#7a6030' : '#555', flexShrink: 0 }}>
                            {Math.floor(msg.duration / 60)}:{String(msg.duration % 60).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div
                        className="px-4 py-2.5 text-xs font-light leading-relaxed"
                        style={{ backgroundColor: isMe ? '#C9A84C' : '#1a1a1a', color: isMe ? '#111111' : '#cccccc', borderRadius: 2 }}
                      >
                        {msg.content}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span style={{ fontSize: '9px', color: '#333' }}>{fmtFull(msg.created_date)}</span>
                      {isMe && <CheckCheck size={10} strokeWidth={1.5} style={{ color: msg.read ? '#C9A84C' : '#555' }} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderTop: '1px solid #1a1a1a', backgroundColor: '#111111' }}>
          {recording ? (
            <div className="flex-1 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#C9A84C' }} />
              <span className="text-xs font-light tabular-nums" style={{ color: '#C9A84C' }}>
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
              </span>
              <div className="flex-1 flex items-end gap-px h-6">
                {[...Array(20)].map((_, i) => (
                  <div key={i} style={{ flex: 1, height: `${20 + Math.random() * 70}%`, backgroundColor: '#C9A84C44', borderRadius: 1 }} />
                ))}
              </div>
              <button onClick={stopRecording} className="p-2" style={{ color: '#C9A84C' }}>
                <Square size={14} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => fileInputRef.current?.click()} style={{ color: '#444' }}>
                <Image size={16} strokeWidth={1.2} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { if (e.target.files[0]) sendImage(e.target.files[0]); }} className="hidden" />
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
                placeholder="Message..."
                className="flex-1 py-2.5 text-xs font-light outline-none"
                style={{ backgroundColor: 'transparent', borderBottom: '1px solid #2a2a2a', caretColor: '#C9A84C', color: '#aaa' }}
              />
              {text.trim() ? (
                <button onClick={sendText} disabled={sending} style={{ color: '#C9A84C' }}>
                  <Send size={15} strokeWidth={1.2} />
                </button>
              ) : (
                <button onMouseDown={startRecording} style={{ color: '#444' }}>
                  <Mic size={16} strokeWidth={1.2} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Conversations list ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <p className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.15em' }}>MESSAGES</p>
        <button onClick={() => setShowNewChat(!showNewChat)} style={{ color: showNewChat ? '#C9A84C' : '#555' }}>
          {showNewChat ? <X size={16} strokeWidth={1.2} /> : <Plus size={16} strokeWidth={1.2} />}
        </button>
      </div>

      {/* Suggestions for new chat */}
      {showNewChat && currentUser && (
        <div style={{ borderBottom: '1px solid #1a1a1a' }}>
          <FriendSuggestions currentUserId={currentUser.id} />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 px-6 py-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <Search size={12} strokeWidth={1.2} style={{ color: '#444' }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher..."
          className="flex-1 text-xs font-light outline-none"
          style={{ backgroundColor: 'transparent', color: '#aaa', caretColor: '#C9A84C' }}
        />
      </div>

      {/* Online friends strip */}
      {(() => {
        const onlineFriends = conversations
          .map(c => ({ conv: c, other: getOther(c) }))
          .filter(({ other }) => other.userId && isOnline(other.userId));
        if (onlineFriends.length === 0) return null;
        return (
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <p className="text-xs font-light mb-3" style={{ color: '#555', letterSpacing: '0.1em', fontSize: '10px' }}>EN LIGNE</p>
            <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {onlineFriends.map(({ conv, other }) => (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <Avatar name={other.name} url={other.avatar} size={44} online={true} />
                  <span className="text-xs font-light truncate" style={{ color: '#888', fontSize: '10px', maxWidth: 52 }}>
                    {other.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={18} strokeWidth={1} style={{ color: '#C9A84C' }} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-xs font-light" style={{ color: '#333', letterSpacing: '0.08em' }}>AUCUNE CONVERSATION</p>
          <p className="text-xs font-light mt-2" style={{ color: '#222' }}>Commence une conversation depuis un profil.</p>
        </div>
      ) : (
        filtered.map(conv => {
          const o = getOther(conv);
          const online = o.userId ? isOnline(o.userId) : false;
          return (
            <button
              key={conv.id}
              onClick={() => setSelected(conv)}
              className="w-full flex items-center gap-3 px-6 py-4 text-left"
              style={{ borderBottom: '1px solid #1a1a1a' }}
            >
              <Avatar name={o.name} url={o.avatar} size={42} online={online} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-light text-white">{o.name}</span>
                    {online && (
                      <span className="text-xs font-light" style={{ color: '#22c55e', fontSize: '9px', letterSpacing: '0.06em' }}>EN LIGNE</span>
                    )}
                  </div>
                  <span style={{ color: '#444', fontSize: '10px' }}>{fmtTime(conv.last_message_time)}</span>
                </div>
                <p className="text-xs font-light truncate" style={{ color: conv.unread_count > 0 ? '#888' : '#555' }}>
                  {conv.last_message || '—'}
                </p>
              </div>
              {conv.unread_count > 0 && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#C9A84C' }}>
                  <span style={{ fontSize: '9px', color: '#111', fontWeight: 500 }}>{conv.unread_count}</span>
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
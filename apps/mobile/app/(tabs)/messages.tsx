import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { supabase, db } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SPACING, FONT } from '../../src/lib/theme';
import { timeAgo, formatTime } from '../../src/lib/utils';
import type { Conversation, Message } from '../../src/lib/types';

function Avatar({ name, url, size = 36, online }: { name: string; url?: string | null; size?: number; online?: boolean }) {
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.blackSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {url
          ? <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" />
          : <Text style={{ color: COLORS.gold, fontSize: size * 0.3 }}>{(name || 'U')[0].toUpperCase()}</Text>}
      </View>
      {online !== undefined && (
        <View style={{ position: 'absolute', bottom: 0, right: 0, width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, backgroundColor: online ? COLORS.green : '#333', borderWidth: 1.5, borderColor: COLORS.black }} />
      )}
    </View>
  );
}

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const getOther = useCallback((conv: Conversation) => {
    if (!user || !conv.participant_ids) return { name: 'Utilisateur', avatar: null, userId: null };
    const idx = conv.participant_ids.findIndex(id => id !== user.id);
    return {
      name: conv.participant_names?.[idx] || 'Utilisateur',
      avatar: conv.participant_avatars?.[idx] || null,
      userId: conv.participant_ids[idx] || null,
    };
  }, [user]);

  const loadConvs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('conversations').select('*')
      .contains('participant_ids', [user.id])
      .order('updated_date', { ascending: false }).limit(30);
    setConvs(data || []);
  }, [user]);

  useEffect(() => { loadConvs().finally(() => setLoading(false)); }, [loadConvs]);

  useEffect(() => {
    if (!selected) return;
    db.filter<Message>('messages', { conversation_id: selected.id }, 'created_date', 100)
      .then((data) => { setMessages(data); setTimeout(() => flatRef.current?.scrollToEnd(), 100); });

    const unsub = db.subscribeToMessages(selected.id, (msg) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      setTimeout(() => flatRef.current?.scrollToEnd(), 100);
    });
    return () => { unsub(); };
  }, [selected?.id]);

  const sendMessage = async () => {
    if (!text.trim() || !selected || !user) return;
    const content = text.trim();
    setText('');
    await db.create('messages', {
      conversation_id: selected.id, sender_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Moi',
      content, type: 'text',
    });
    await db.update('conversations', selected.id, { last_message: content, last_message_time: new Date().toISOString() });
  };

  const onRefresh = async () => { setRefreshing(true); await loadConvs(); setRefreshing(false); };

  // ── Chat view ──
  if (selected) {
    const o = getOther(selected);
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.chatHeader}>
          <TouchableOpacity onPress={() => setSelected(null)} style={{ marginRight: SPACING.md }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Avatar name={o.name} url={o.avatar} size={32} />
          <View style={{ marginLeft: SPACING.md, flex: 1 }}>
            <Text style={s.chatName}>{o.name}</Text>
          </View>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: SPACING.xl, paddingBottom: SPACING.xxl }}
          renderItem={({ item: msg }) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <View style={[s.msgWrap, isMe ? s.msgMe : s.msgOther]}>
                <View style={[s.bubble, { backgroundColor: isMe ? COLORS.gold : COLORS.blackSecondary }]}>
                  <Text style={[s.msgText, { color: isMe ? COLORS.black : COLORS.white }]}>{msg.content}</Text>
                </View>
                <Text style={s.msgTime}>{formatTime(msg.created_date)}</Text>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />

        <View style={s.inputBar}>
          <TextInput
            style={s.msgInput} value={text} onChangeText={setText}
            placeholder="Message..." placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={sendMessage} returnKeyType="send"
          />
          <TouchableOpacity onPress={sendMessage} disabled={!text.trim()}>
            <Text style={{ color: text.trim() ? COLORS.gold : COLORS.textDim, fontSize: 18 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Liste conversations ──
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>MESSAGES</Text>
      </View>
      <FlatList
        data={convs}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        ListEmptyComponent={<View style={s.center}><Text style={s.empty}>AUCUNE CONVERSATION</Text></View>}
        renderItem={({ item: conv }) => {
          const o = getOther(conv);
          return (
            <TouchableOpacity style={s.convRow} onPress={() => setSelected(conv)}>
              <Avatar name={o.name} url={o.avatar} size={42} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={s.convName}>{o.name}</Text>
                  <Text style={s.convTime}>{timeAgo(conv.last_message_time)}</Text>
                </View>
                <Text style={s.convLast} numberOfLines={1}>{conv.last_message || '—'}</Text>
              </View>
              {conv.unread_count > 0 && (
                <View style={s.badge}><Text style={s.badgeText}>{conv.unread_count}</Text></View>
              )}
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.xl, paddingTop: 56, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  title: { color: COLORS.gold, fontSize: FONT.sizes.xs, letterSpacing: 6, fontWeight: FONT.light },
  center: { paddingTop: 80, alignItems: 'center' },
  empty: { color: COLORS.textDim, fontSize: FONT.sizes.xs, letterSpacing: 3 },
  convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  convName: { color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: FONT.light },
  convTime: { color: COLORS.textDim, fontSize: 10 },
  convLast: { color: COLORS.textMuted, fontSize: FONT.sizes.xs },
  badge: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: COLORS.black, fontSize: 9, fontWeight: FONT.medium },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: 56, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  chatName: { color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: FONT.light },
  msgWrap: { marginBottom: SPACING.sm },
  msgMe: { alignItems: 'flex-end' },
  msgOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '72%', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  msgText: { fontSize: FONT.sizes.xs, fontWeight: FONT.light, lineHeight: 18 },
  msgTime: { color: COLORS.textDim, fontSize: 9, marginTop: 2 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: SPACING.md },
  msgInput: { flex: 1, color: COLORS.white, fontSize: FONT.sizes.xs, fontWeight: FONT.light, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: SPACING.sm },
});
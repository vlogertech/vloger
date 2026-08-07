import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { supabase, db } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SPACING, FONT } from '../../src/lib/theme';
import { timeAgo } from '../../src/lib/utils';
import type { Notification } from '../../src/lib/types';

const ICONS: Record<string, string> = {
  like: '♥', comment: '✦', follow: '◯', mention: '@', message: '✉',
};

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await db.filter<Notification>('notifications', { user_id: user.id }, '-created_date', 50).catch(() => []);
    setNotifs(data);
    // Marquer comme lues (mise à jour groupée : hors du CRUD générique, appel direct)
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>NOTIFICATIONS</Text>
      </View>
      <FlatList
        data={notifs}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        ListEmptyComponent={<View style={s.center}><Text style={s.empty}>AUCUNE NOTIFICATION</Text></View>}
        renderItem={({ item: n }) => (
          <View style={[s.row, !n.read && s.unread]}>
            <View style={s.avatar}>
              {n.actor_avatar
                ? <Image source={{ uri: n.actor_avatar }} style={{ width: 36, height: 36 }} contentFit="cover" />
                : <Text style={s.avatarLetter}>{(n.actor_name || 'V')[0]}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>
                <Text style={s.actor}>{n.actor_name} </Text>
                <Text style={s.action}>
                  {n.type === 'like' ? 'a aimé ta publication'
                    : n.type === 'comment' ? 'a commenté'
                    : n.type === 'follow' ? 'te suit maintenant'
                    : n.type === 'mention' ? 't\'a mentionné'
                    : 't\'a envoyé un message'}
                </Text>
              </Text>
              <Text style={s.time}>{timeAgo(n.created_date)}</Text>
            </View>
            <Text style={{ color: n.read ? COLORS.textDim : COLORS.gold, fontSize: 14 }}>
              {ICONS[n.type] || '·'}
            </Text>
          </View>
        )}
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  unread: { backgroundColor: '#161610' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.blackSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md, overflow: 'hidden' },
  avatarLetter: { color: COLORS.gold, fontSize: FONT.sizes.sm },
  text: { fontSize: FONT.sizes.xs, fontWeight: FONT.light, marginBottom: 2 },
  actor: { color: COLORS.white },
  action: { color: COLORS.textMuted },
  time: { color: COLORS.textDim, fontSize: 10 },
});
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../src/lib/supabase';
import { COLORS, SPACING, FONT } from '../../src/lib/theme';
import { formatCount } from '../../src/lib/utils';
import type { Post, Profile } from '../../src/lib/types';

const TAGS = ['voyage', 'musique', 'podcast', 'humour', 'cuisine', 'sport', 'tech', 'art'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setPosts([]); setUsers([]); return; }
    const t = setTimeout(doSearch, 400);
    return () => clearTimeout(t);
  }, [query]);

  const doSearch = async () => {
    setLoading(true);
    const q = query.toLowerCase();
    const [{ data: p }, { data: u }] = await Promise.all([
      supabase.from('posts').select('*').or(`title.ilike.%${q}%,description.ilike.%${q}%`).limit(20),
      supabase.from('profiles').select('*').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(10),
    ]);
    setPosts(p || []);
    setUsers(u || []);
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <View style={s.searchBar}>
        <Text style={{ color: COLORS.textMuted, marginRight: SPACING.sm }}>⌕</Text>
        <TextInput
          style={s.input} value={query} onChangeText={setQuery}
          placeholder="Rechercher créateurs, vlogs..." placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={{ color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!query ? (
        <View style={s.tags}>
          <Text style={s.sectionTitle}>TENDANCES</Text>
          <View style={s.tagWrap}>
            {TAGS.map(tag => (
              <TouchableOpacity key={tag} style={s.tag} onPress={() => setQuery(tag)}>
                <Text style={s.tagText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
      ) : (
        <FlatList
          data={[
            ...users.map(u => ({ ...u, _type: 'user' as const })),
            ...posts.map(p => ({ ...p, _type: 'post' as const })),
          ]}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.empty}>AUCUN RÉSULTAT</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item._type === 'user') {
              const u = item as Profile & { _type: 'user' };
              return (
                <View style={s.userRow}>
                  <View style={s.avatar}>
                    {u.avatar_url
                      ? <Image source={{ uri: u.avatar_url }} style={{ width: 36, height: 36 }} contentFit="cover" />
                      : <Text style={s.avatarLetter}>{(u.display_name || u.username || 'U')[0].toUpperCase()}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{u.display_name || u.username}</Text>
                    <Text style={s.userSub}>@{u.username} · {formatCount(u.followers_count)} followers</Text>
                  </View>
                </View>
              );
            }
            const p = item as Post & { _type: 'post' };
            return (
              <View style={s.postRow}>
                <View style={s.postIcon}>
                  <Text style={{ color: COLORS.gold, fontSize: 12 }}>{p.type === 'vlog' ? '▶' : '🎤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.postTitle} numberOfLines={1}>{p.title || p.description || '—'}</Text>
                  <Text style={s.postSub}>@{p.author_username} · {formatCount(p.likes_count)} likes</Text>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingTop: 56, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  input: { flex: 1, color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: FONT.light },
  tags: { padding: SPACING.xl },
  sectionTitle: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 3, marginBottom: SPACING.md },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tag: { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tagText: { color: COLORS.textSecondary, fontSize: FONT.sizes.xs },
  center: { paddingTop: 80, alignItems: 'center' },
  empty: { color: COLORS.textDim, fontSize: FONT.sizes.xs, letterSpacing: 3 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.blackSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md, overflow: 'hidden' },
  avatarLetter: { color: COLORS.gold, fontSize: FONT.sizes.sm },
  userName: { color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: FONT.light },
  userSub: { color: COLORS.textMuted, fontSize: 10 },
  postRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  postIcon: { width: 32, height: 32, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  postTitle: { color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: FONT.light },
  postSub: { color: COLORS.textMuted, fontSize: 10 },
});

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import { supabase, db } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SPACING, FONT } from '../../src/lib/theme';
import { formatCount, timeAgo, formatDuration } from '../../src/lib/utils';
import type { Post } from '../../src/lib/types';

const { width } = Dimensions.get('window');
const VIDEO_H = (width - SPACING.xl * 2) * 9 / 16;
const TABS = ['Pour vous', 'Abonnements', 'Tendances'];

function encodeVideoUri(uri: string): string {
  try {
    const url = new URL(uri);
    url.pathname = url.pathname.split('/').map(seg =>
      encodeURIComponent(decodeURIComponent(seg))
    ).join('/');
    url.hash = '';
    return url.toString();
  } catch {
    return uri;
  }
}

// Notifie l'auteur du post lors d'un like (jamais sur soi-même, jamais au unlike —
// le garde-fou anti auto-notif est géré par @vloger/shared)
async function notifyLike(post: Post, userId: string, actorName: string) {
  if (!post.author_id) return;
  await db.createNotification({
    userId: post.author_id,
    actorId: userId,
    actorName,
    type: 'like',
    postId: post.id,
    postThumbnail: post.thumbnail_url || undefined,
  }).catch(() => {
    // notification best-effort : on ne bloque jamais le like pour ça
  });
}

// ── Voice card ───────────────────────────────────────────────────────────────
function VoiceCard({ post, userId, actorName }: { post: Post; userId: string; actorName: string }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!userId) return;
    db.getLikeStatus(post.id, userId).then(setLiked);
    return () => { soundRef.current?.unloadAsync(); };
  }, [post.id, userId]);

  const togglePlay = async () => {
    if (!post.audio_url) return;
    try {
      if (playing) {
        await soundRef.current?.pauseAsync();
        setPlaying(false);
      } else {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: post.audio_url },
            { shouldPlay: true }
          );
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s: AVPlaybackStatus) => {
            if ('didJustFinish' in s && s.didJustFinish) setPlaying(false);
          });
        } else {
          await soundRef.current.playAsync();
        }
        setPlaying(true);
      }
    } catch (e) {
      console.warn('audio error', e);
    }
  };

  const handleLike = async () => {
    if (!userId || liking) return;
    setLiking(true);
    try {
      const nowLiked = await db.toggleLike(post.id, userId);
      setLiked(nowLiked);
      setLikesCount(c => nowLiked ? c + 1 : Math.max(0, c - 1));
      if (nowLiked) notifyLike(post, userId, actorName);
    } finally {
      setLiking(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          {post.author_avatar
            ? <Image source={{ uri: post.author_avatar }} style={s.avatarImg} contentFit="cover" />
            : <Text style={s.avatarLetter}>{(post.author_name || 'V')[0]}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.authorName}>{post.author_name}</Text>
          <Text style={s.authorSub}>@{post.author_username} · {timeAgo(post.created_date)}</Text>
        </View>
        <Text style={s.typeTag}>VOICE</Text>
      </View>

      {(post.title || post.description) && (
        <View style={s.info}>
          {post.title && <Text style={s.postTitle}>{post.title}</Text>}
          {post.description && <Text style={s.postDesc} numberOfLines={2}>{post.description}</Text>}
        </View>
      )}

      <View style={s.voicePlayer}>
        <TouchableOpacity style={s.playBtn} onPress={togglePlay} disabled={!post.audio_url}>
          <Text style={{ color: post.audio_url ? COLORS.gold : COLORS.textDim, fontSize: 18 }}>
            {playing ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>
        <View style={s.waveform}>
          {Array.from({ length: 32 }).map((_, i) => (
            <View key={i} style={[s.bar, { height: 4 + Math.abs(Math.sin(i * 0.7) * 20), backgroundColor: playing ? COLORS.gold : COLORS.border }]} />
          ))}
        </View>
        {post.duration ? <Text style={s.duration}>{formatDuration(post.duration)}</Text> : null}
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={s.action} onPress={handleLike}>
          <Text style={{ color: liked ? COLORS.gold : COLORS.textDim, fontSize: 16 }}>♥</Text>
          <Text style={s.actionCount}>{formatCount(likesCount)}</Text>
        </TouchableOpacity>
        <View style={s.action}>
          <Text style={{ color: COLORS.textDim, fontSize: 14 }}>✦</Text>
          <Text style={s.actionCount}>{formatCount(post.comments_count)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Vlog card ────────────────────────────────────────────────────────────────
function VlogCard({ post, userId, actorName }: { post: Post; userId: string; actorName: string }) {
  const videoRef = useRef<Video>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [liking, setLiking] = useState(false);
  const videoUri = post.video_url ? encodeVideoUri(post.video_url) : null;

  useEffect(() => {
    if (!userId) return;
    db.getLikeStatus(post.id, userId).then(setLiked);
  }, [post.id, userId]);

  const togglePlay = async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (playing) {
        await videoRef.current?.pauseAsync();
        setPlaying(false);
      } else {
        await videoRef.current?.playAsync();
        setPlaying(true);
      }
    } catch (e) {
      console.warn('video play error', e);
    }
  };

  const handleLike = async () => {
    if (!userId || liking) return;
    setLiking(true);
    try {
      const nowLiked = await db.toggleLike(post.id, userId);
      setLiked(nowLiked);
      setLikesCount(c => nowLiked ? c + 1 : Math.max(0, c - 1));
      if (nowLiked) notifyLike(post, userId, actorName);
    } finally {
      setLiking(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          {post.author_avatar
            ? <Image source={{ uri: post.author_avatar }} style={s.avatarImg} contentFit="cover" />
            : <Text style={s.avatarLetter}>{(post.author_name || 'V')[0]}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.authorName}>{post.author_name}</Text>
          <Text style={s.authorSub}>@{post.author_username} · {timeAgo(post.created_date)}</Text>
        </View>
        <Text style={s.views}>{formatCount(post.views_count)} vues</Text>
      </View>

      <View style={s.videoWrap}>
        {videoUri ? (
          <>
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
              onPlaybackStatusUpdate={(st: AVPlaybackStatus) => {
                if ('isPlaying' in st) setPlaying(st.isPlaying);
              }}
            />
            <TouchableOpacity style={s.playOverlay} onPress={togglePlay} activeOpacity={0.8}>
              {!playing && (
                <View style={s.playCircle}>
                  <Text style={{ color: COLORS.black, fontSize: 18, marginLeft: 3 }}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : post.thumbnail_url ? (
          <Image source={{ uri: post.thumbnail_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.videoEmpty]}>
            <Text style={{ color: COLORS.textDim, fontSize: 24 }}>▶</Text>
          </View>
        )}
      </View>

      {(post.title || post.description) && (
        <View style={s.info}>
          {post.title && <Text style={s.postTitle}>{post.title}</Text>}
          {post.description && <Text style={s.postDesc} numberOfLines={2}>{post.description}</Text>}
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={s.action} onPress={handleLike}>
          <Text style={{ color: liked ? COLORS.gold : COLORS.textDim, fontSize: 16 }}>♥</Text>
          <Text style={s.actionCount}>{formatCount(likesCount)}</Text>
        </TouchableOpacity>
        <View style={s.action}>
          <Text style={{ color: COLORS.textDim, fontSize: 14 }}>✦</Text>
          <Text style={s.actionCount}>{formatCount(post.comments_count)}</Text>
        </View>
        <View style={s.action}>
          <Text style={{ color: COLORS.textDim, fontSize: 14 }}>↗</Text>
          <Text style={s.actionCount}>{formatCount(post.shares_count)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const loadPosts = useCallback(async () => {
    const data = await db.list<Post>('posts', '-created_date', 30).catch(() => null);
    if (data) setPosts(data);
  }, []);

  useEffect(() => {
    loadPosts().finally(() => setLoading(false));
    if (user?.id) {
      supabase.from('follows').select('following_id').eq('follower_id', user.id)
        .then(({ data }) => setFollowingIds((data || []).map((f: { following_id: string }) => f.following_id)));
    }
  }, [loadPosts, user?.id]);

  const onRefresh = async () => { setRefreshing(true); await loadPosts(); setRefreshing(false); };

  const actorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vloger';

  const displayed = activeTab === 1
    ? posts.filter(p => followingIds.includes(p.author_id))
    : activeTab === 2
    ? [...posts].sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
    : posts;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.logo}>VLOGER</Text>
      </View>
      <View style={s.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(i)} style={s.tab}>
            <Text style={[s.tabText, { color: activeTab === i ? COLORS.white : COLORS.textDim }]}>{tab}</Text>
            {activeTab === i && <View style={s.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) =>
            item.type === 'voice'
              ? <VoiceCard post={item} userId={user?.id || ''} actorName={actorName} />
              : <VlogCard post={item} userId={user?.id || ''} actorName={actorName} />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
          ListEmptyComponent={<View style={s.center}><Text style={s.empty}>AUCUNE PUBLICATION</Text></View>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.xl, paddingTop: 56, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  logo: { color: COLORS.gold, fontSize: FONT.sizes.xs, letterSpacing: 8, fontWeight: FONT.light },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  tab: { marginRight: SPACING.xl, paddingVertical: SPACING.md, position: 'relative' },
  tabText: { fontSize: FONT.sizes.xs, letterSpacing: 2, fontWeight: FONT.light },
  tabLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: COLORS.gold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  empty: { color: COLORS.textDim, fontSize: FONT.sizes.xs, letterSpacing: 3 },
  card: { marginBottom: SPACING.xxl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.blackSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md, overflow: 'hidden' },
  avatarImg: { width: 28, height: 28 },
  avatarLetter: { color: COLORS.gold, fontSize: FONT.sizes.xs },
  authorName: { color: COLORS.white, fontSize: FONT.sizes.xs, fontWeight: FONT.light },
  authorSub: { color: COLORS.textMuted, fontSize: 10 },
  views: { color: COLORS.textMuted, fontSize: 10 },
  typeTag: { color: COLORS.gold, fontSize: 9, letterSpacing: 2, borderWidth: 1, borderColor: COLORS.gold + '44', paddingHorizontal: 6, paddingVertical: 2 },
  videoWrap: { width: width - SPACING.xl * 2, height: VIDEO_H, marginHorizontal: SPACING.xl, backgroundColor: COLORS.blackSecondary, overflow: 'hidden' },
  videoEmpty: { alignItems: 'center', justifyContent: 'center' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: SPACING.xl, marginTop: SPACING.md },
  postTitle: { color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: FONT.light, marginBottom: 2 },
  postDesc: { color: COLORS.textMuted, fontSize: FONT.sizes.xs },
  actions: { flexDirection: 'row', paddingHorizontal: SPACING.xl, marginTop: SPACING.md, gap: SPACING.xl },
  action: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  actionCount: { color: COLORS.textMuted, fontSize: 11 },
  voicePlayer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.xl, marginTop: SPACING.sm, gap: SPACING.md, paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: SPACING.md },
  playBtn: { width: 36, height: 36, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { flex: 1, borderRadius: 1 },
  duration: { color: COLORS.textDim, fontSize: 9 },
});
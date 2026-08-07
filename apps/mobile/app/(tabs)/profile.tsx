import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import { supabase, db } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SPACING, FONT } from '../../src/lib/theme';
import { formatCount, formatDuration } from '../../src/lib/utils';
import type { Profile, Post } from '../../src/lib/types';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 2) / 2;

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

function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    return () => {
      videoRef.current?.stopAsync();
      soundRef.current?.unloadAsync();
    };
  }, []);

  const toggleAudio = async () => {
    if (!post.audio_url) return;
    try {
      if (playing) {
        await soundRef.current?.pauseAsync();
        setPlaying(false);
      } else {
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
    } catch (e) { console.warn(e); }
  };

  const toggleVideo = async () => {
    try {
      if (playing) {
        await videoRef.current?.pauseAsync();
        setPlaying(false);
      } else {
        await videoRef.current?.playAsync();
        setPlaying(true);
      }
    } catch (e) { console.warn(e); }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={m.backdrop}>
        <TouchableOpacity style={m.closeArea} onPress={onClose} />
        <View style={m.sheet}>
          <TouchableOpacity style={m.closeBtn} onPress={onClose}>
            <Text style={m.closeTxt}>✕</Text>
          </TouchableOpacity>

          {post.type === 'vlog' && post.video_url ? (
            <View style={m.videoWrap}>
              <Video
                ref={videoRef}
                source={{ uri: encodeVideoUri(post.video_url) }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                onPlaybackStatusUpdate={(st: AVPlaybackStatus) => {
                  if ('isPlaying' in st) setPlaying(st.isPlaying);
                }}
              />
              <TouchableOpacity style={m.playOverlay} onPress={toggleVideo} activeOpacity={0.8}>
                {!playing && (
                  <View style={m.playCircle}>
                    <Text style={{ color: COLORS.black, fontSize: 20, marginLeft: 3 }}>▶</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : post.type === 'voice' && post.audio_url ? (
            <View style={m.audioWrap}>
              <TouchableOpacity style={m.bigPlayBtn} onPress={toggleAudio}>
                <Text style={{ color: COLORS.gold, fontSize: 32 }}>{playing ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
              <Text style={m.audioLabel}>{playing ? 'EN LECTURE...' : 'APPUIE POUR LIRE'}</Text>
              {post.duration ? <Text style={m.audioDuration}>{formatDuration(post.duration)}</Text> : null}
            </View>
          ) : null}

          {(post.title || post.description) && (
            <View style={m.info}>
              {post.title && <Text style={m.title}>{post.title}</Text>}
              {post.description && <Text style={m.desc}>{post.description}</Text>}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vlogs' | 'voice'>('vlogs');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, ps] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      db.filter<Post>('posts', { author_id: user.id }, '-created_date', 30).catch(() => []),
    ]);
    setProfile(p);
    setPosts(ps);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = posts.filter(p => activeTab === 'vlogs' ? p.type === 'vlog' : p.type === 'voice');

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>;

  const name = profile?.display_name || user?.user_metadata?.full_name || 'Vloger';
  const username = profile?.username || user?.email?.split('@')[0] || 'user';

  return (
    <>
      <ScrollView style={s.root} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}>
        <View style={s.banner}>
          {profile?.banner_url
            ? <Image source={{ uri: profile.banner_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.blackSecondary }]} />}
        </View>

        <View style={s.body}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              {profile?.avatar_url
                ? <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72 }} contentFit="cover" />
                : <Text style={s.avatarLetter}>{name[0]}</Text>}
            </View>
          </View>
          <Text style={s.name}>{name}</Text>
          <Text style={s.username}>@{username}</Text>
          {profile?.bio && <Text style={s.bio}>{profile.bio}</Text>}

          <View style={s.stats}>
            {[
              { label: 'Posts', value: formatCount(posts.length) },
              { label: 'Followers', value: formatCount(profile?.followers_count) },
              { label: 'Suivis', value: formatCount(profile?.following_count) },
            ].map(stat => (
              <View key={stat.label} style={s.stat}>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
            <Text style={s.logoutText}>SE DÉCONNECTER</Text>
          </TouchableOpacity>
        </View>

        <View style={s.tabs}>
          {(['vlogs', 'voice'] as const).map(tab => (
            <TouchableOpacity key={tab} style={s.tab} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, { color: activeTab === tab ? COLORS.white : COLORS.textDim }]}>
                {tab === 'vlogs' ? 'VLOGS' : 'VOICE'}
              </Text>
              {activeTab === tab && <View style={s.tabLine} />}
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={s.center}>
            <Text style={s.empty}>AUCUN {activeTab === 'vlogs' ? 'VLOG' : 'VOICE POST'}</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {filtered.map(p => (
              <TouchableOpacity key={p.id} style={s.gridItem} onPress={() => setSelectedPost(p)} activeOpacity={0.85}>
                {p.thumbnail_url ? (
                  <Image source={{ uri: p.thumbnail_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : p.video_url ? (
                  <Video
                    source={{ uri: encodeVideoUri(p.video_url) }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, s.voiceThumb]}>
                    <Text style={{ fontSize: 28 }}>🎤</Text>
                  </View>
                )}
                <View style={s.gridOverlay}>
                  <Text style={s.gridPlay}>{p.type === 'voice' ? '🎤' : '▶'}</Text>
                </View>
                <View style={s.gridBottom}>
                  <Text style={s.gridLikes}>{formatCount(p.likes_count)}♥</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  empty: { color: COLORS.textDim, fontSize: FONT.sizes.xs, letterSpacing: 3 },
  banner: { height: 140 },
  body: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  avatarWrap: { marginTop: -36, marginBottom: SPACING.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.blackSecondary, borderWidth: 2, borderColor: COLORS.black, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarLetter: { color: COLORS.gold, fontSize: 28, fontWeight: FONT.light },
  name: { color: COLORS.white, fontSize: FONT.sizes.lg, fontWeight: FONT.light, marginBottom: 2 },
  username: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, marginBottom: SPACING.sm },
  bio: { color: COLORS.textSecondary, fontSize: FONT.sizes.xs, fontWeight: FONT.light, lineHeight: 18, marginBottom: SPACING.md },
  stats: { flexDirection: 'row', gap: SPACING.xxl, marginBottom: SPACING.xl },
  stat: {},
  statValue: { color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: FONT.light },
  statLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 1 },
  logoutBtn: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, alignItems: 'center' },
  logoutText: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  tab: { marginRight: SPACING.xl, paddingVertical: SPACING.md, position: 'relative' },
  tabText: { fontSize: FONT.sizes.xs, letterSpacing: 3, fontWeight: FONT.light },
  tabLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: COLORS.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE * 9 / 16, position: 'relative', backgroundColor: COLORS.blackSecondary },
  voiceThumb: { alignItems: 'center', justifyContent: 'center' },
  gridOverlay: { position: 'absolute', top: 6, left: 6 },
  gridPlay: { fontSize: 10, color: COLORS.white },
  gridBottom: { position: 'absolute', bottom: 4, right: 6 },
  gridLikes: { color: COLORS.gold, fontSize: 9 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  closeArea: { flex: 1 },
  sheet: { backgroundColor: COLORS.blackSecondary, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingBottom: 40 },
  closeBtn: { alignSelf: 'flex-end', padding: SPACING.md },
  closeTxt: { color: COLORS.textMuted, fontSize: 18 },
  videoWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: COLORS.black },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  audioWrap: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  bigPlayBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  audioLabel: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 2 },
  audioDuration: { color: COLORS.textDim, fontSize: 11 },
  info: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  title: { color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: FONT.light, marginBottom: 4 },
  desc: { color: COLORS.textMuted, fontSize: FONT.sizes.xs },
});
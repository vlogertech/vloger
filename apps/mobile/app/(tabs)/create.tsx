import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { supabase, db } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SPACING, FONT } from '../../src/lib/theme';
import { formatDuration } from '../../src/lib/utils';

type PostType = 'vlog' | 'voice';

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [postType, setPostType] = useState<PostType>('vlog');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Vlog
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  // Voice
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission requise', "Autorise l'accès à la galerie."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled) setVideoUri(result.assets[0].uri);
  };

  const pickThumbnail = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setThumbnailUri(result.assets[0].uri);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission requise', "Autorise l'accès au microphone."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      Alert.alert('Erreur', "Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current!);
    if (!recordingRef.current) return;
    await recordingRef.current.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    setAudioUri(recordingRef.current.getURI());
    recordingRef.current = null;
    setIsRecording(false);
  };

  const resetRecording = () => { setAudioUri(null); setRecordingTime(0); };

  // Nettoie le nom de fichier (accents/espaces/caractères spéciaux) pour
  // éviter les erreurs de storage et les collisions de chemins.
  const sanitizeFileName = (name: string): string => {
    const parts = String(name || 'file').split('.');
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const base = parts
      .join('.')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '')
      .slice(0, 60);
    return ext ? `${base || 'file'}.${ext}` : base || 'file';
  };

  const uploadToSupabase = async (uri: string, bucket: string, filename: string): Promise<string> => {
    if (!user) throw new Error('Utilisateur non authentifié.');
    const response = await fetch(uri);
    const blob = await response.blob();
    // Chemin scopé par utilisateur : {user_id}/{timestamp}-{nom-assaini}
    // → cohérent avec la policy RLS storage (auth.uid() = owner) et évite
    //   toute collision entre deux utilisateurs. upsert désactivé car le
    //   chemin est désormais unique.
    const path = `${user.id}/${Date.now()}-${sanitizeFileName(filename)}`;
    const { data, error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  };

  const handlePublish = async () => {
    if (!title.trim() && !description.trim()) { Alert.alert('Erreur', 'Ajoute un titre ou une description.'); return; }
    if (postType === 'vlog' && !videoUri) { Alert.alert('Erreur', 'Sélectionne une vidéo.'); return; }
    if (postType === 'voice' && !audioUri) { Alert.alert('Erreur', 'Enregistre un message vocal.'); return; }
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      const ts = Date.now();
      let video_url = null, audio_url = null, thumbnail_url = null;

      if (postType === 'vlog' && videoUri) {
        video_url = await uploadToSupabase(videoUri, 'videos', `${ts}-video.mp4`);
        if (thumbnailUri) thumbnail_url = await uploadToSupabase(thumbnailUri, 'thumbnails', `${ts}-thumb.jpg`);
      }
      if (postType === 'voice' && audioUri) {
        audio_url = await uploadToSupabase(audioUri, 'audio', `${ts}-voice.m4a`);
      }

      await db.create('posts', {
        author_id: user.id,
        author_name: profile?.display_name || user.email?.split('@')[0] || 'Vloger',
        author_username: profile?.username || user.email?.split('@')[0] || 'user',
        author_avatar: profile?.avatar_url || null,
        type: postType,
        title: title.trim() || null,
        description: description.trim() || null,
        video_url, audio_url, thumbnail_url,
        likes_count: 0, comments_count: 0, shares_count: 0, views_count: 0,
        duration: postType === 'voice' ? recordingTime : null,
      });

      if (profile) {
        await db.update('profiles', profile.id, { posts_count: (profile.posts_count || 0) + 1 });
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de publier.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={COLORS.gold} size="large" />
      <Text style={s.loadingText}>Publication en cours...</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{postType === 'vlog' ? 'NOUVEAU VLOG' : 'VOICE POST'}</Text>
        <TouchableOpacity onPress={handlePublish}>
          <Text style={s.publishBtn}>PUBLIER</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.typeRow}>
          {(['vlog', 'voice'] as PostType[]).map(t => (
            <TouchableOpacity key={t} style={[s.typeBtn, postType === t && s.typeBtnActive]} onPress={() => setPostType(t)}>
              <Text style={[s.typeBtnText, { color: postType === t ? COLORS.gold : COLORS.textDim }]}>
                {t === 'vlog' ? '▶  VLOG' : '🎤  VOICE'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {postType === 'vlog' && (
          <View style={s.section}>
            <TouchableOpacity style={s.mediaPicker} onPress={pickVideo}>
              {videoUri ? (
                <View style={s.mediaSelected}>
                  <Text style={{ color: COLORS.gold, fontSize: 24 }}>▶</Text>
                  <Text style={s.mediaSelectedText}>Vidéo sélectionnée</Text>
                  <Text style={s.mediaChange}>Appuie pour changer</Text>
                </View>
              ) : (
                <View style={s.mediaEmpty}>
                  <Text style={{ color: COLORS.textDim, fontSize: 32 }}>↑</Text>
                  <Text style={s.mediaEmptyText}>IMPORTER UNE VIDÉO</Text>
                  <Text style={s.mediaEmptyHint}>MP4, MOV — depuis la galerie</Text>
                </View>
              )}
            </TouchableOpacity>
            {videoUri && (
              <TouchableOpacity style={s.thumbPicker} onPress={pickThumbnail}>
                {thumbnailUri
                  ? <Image source={{ uri: thumbnailUri }} style={s.thumbPreview} contentFit="cover" />
                  : <Text style={s.thumbPickerText}>+ Ajouter une miniature (optionnel)</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {postType === 'voice' && (
          <View style={[s.section, s.voiceSection]}>
            {!isRecording && !audioUri && (
              <TouchableOpacity style={s.recordBtn} onPress={startRecording}>
                <Text style={s.recordIcon}>🎤</Text>
                <Text style={s.recordBtnText}>DÉMARRER L'ENREGISTREMENT</Text>
              </TouchableOpacity>
            )}
            {isRecording && (
              <View style={s.recordingActive}>
                <Text style={s.recordingTime}>{formatDuration(recordingTime)}</Text>
                <Text style={s.recordingLabel}>● EN COURS</Text>
                <TouchableOpacity style={s.stopBtn} onPress={stopRecording}>
                  <Text style={s.stopBtnText}>■  ARRÊTER</Text>
                </TouchableOpacity>
              </View>
            )}
            {!isRecording && audioUri && (
              <View style={s.audioReady}>
                <Text style={s.audioReadyText}>✓  Enregistrement prêt · {formatDuration(recordingTime)}</Text>
                <TouchableOpacity onPress={resetRecording}>
                  <Text style={s.retryText}>RECOMMENCER</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={s.fields}>
          <Text style={s.label}>TITRE</Text>
          <TextInput
            style={s.input} value={title} onChangeText={setTitle}
            placeholder="Titre de ta publication..." placeholderTextColor={COLORS.textMuted}
            maxLength={120}
          />
          <Text style={[s.label, { marginTop: SPACING.md }]}>DESCRIPTION</Text>
          <TextInput
            style={[s.input, { height: 72 }]} value={description} onChangeText={setDescription}
            placeholder="Décris ton contenu..." placeholderTextColor={COLORS.textMuted}
            multiline maxLength={500}
          />
        </View>

        <TouchableOpacity style={s.publishFull} onPress={handlePublish}>
          <Text style={s.publishFullText}>{postType === 'vlog' ? 'PUBLIER LE VLOG' : 'PUBLIER LE VOICE POST'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  center: { flex: 1, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: 56, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  back: { color: COLORS.textMuted, fontSize: 20 },
  headerTitle: { color: COLORS.gold, fontSize: FONT.sizes.xs, letterSpacing: 4, fontWeight: FONT.light },
  publishBtn: { color: COLORS.gold, fontSize: FONT.sizes.xs, letterSpacing: 2 },
  scroll: { padding: SPACING.xl, paddingBottom: 60 },
  typeRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  typeBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  typeBtnActive: { borderColor: COLORS.gold + '55', backgroundColor: COLORS.gold + '0a' },
  typeBtnText: { fontSize: FONT.sizes.xs, letterSpacing: 2, fontWeight: FONT.light },
  section: { marginBottom: SPACING.xl },
  mediaPicker: { borderWidth: 1, borderColor: COLORS.border, aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center' },
  mediaEmpty: { alignItems: 'center', gap: SPACING.sm },
  mediaEmptyText: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 3 },
  mediaEmptyHint: { color: COLORS.textDim, fontSize: 10 },
  mediaSelected: { alignItems: 'center', gap: SPACING.sm },
  mediaSelectedText: { color: COLORS.white, fontSize: FONT.sizes.xs },
  mediaChange: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1 },
  thumbPicker: { marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, height: 48, alignItems: 'center', justifyContent: 'center' },
  thumbPickerText: { color: COLORS.textMuted, fontSize: FONT.sizes.xs },
  thumbPreview: { width: '100%', height: 48 },
  voiceSection: { borderWidth: 1, borderColor: COLORS.borderLight, padding: SPACING.xl, alignItems: 'center', minHeight: 140, justifyContent: 'center' },
  recordBtn: { alignItems: 'center', gap: SPACING.md },
  recordIcon: { fontSize: 36 },
  recordBtnText: { color: COLORS.gold, fontSize: FONT.sizes.xs, letterSpacing: 3 },
  recordingActive: { alignItems: 'center', gap: SPACING.md },
  recordingTime: { color: COLORS.gold, fontSize: FONT.sizes.xxxl, fontWeight: FONT.light },
  recordingLabel: { color: COLORS.red, fontSize: FONT.sizes.xs, letterSpacing: 2 },
  stopBtn: { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  stopBtnText: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 2 },
  audioReady: { alignItems: 'center', gap: SPACING.md },
  audioReadyText: { color: COLORS.gold, fontSize: FONT.sizes.xs, letterSpacing: 1 },
  retryText: { color: COLORS.textDim, fontSize: FONT.sizes.xs, letterSpacing: 2 },
  fields: { gap: SPACING.sm, marginBottom: SPACING.xl },
  label: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 2 },
  input: { color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: FONT.light, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: SPACING.sm, textAlignVertical: 'top' },
  publishFull: { backgroundColor: COLORS.gold, paddingVertical: SPACING.lg, alignItems: 'center' },
  publishFullText: { color: COLORS.black, fontSize: FONT.sizes.xs, letterSpacing: 4, fontWeight: FONT.medium },
});
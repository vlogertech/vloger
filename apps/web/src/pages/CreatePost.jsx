import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUser, dbFilter, dbCreate, dbUpdate } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import {
  ArrowLeft, Upload, Mic, Square, Play, Pause,
  Image, X, MapPin, Hash, Eye, CheckCircle, AlertCircle
} from 'lucide-react';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const inputStyle = {
  backgroundColor: 'transparent',
  borderBottom: '1px solid #2a2a2a',
  borderRadius: 0,
  caretColor: '#C9A84C',
};

// ── Waveform bars (static decorative) ──
function Waveform({ active = false, bars = 40 }) {
  const heights = useRef(
    Array.from({ length: bars }, (_, i) => 18 + Math.abs(Math.sin(i * 0.6 + 1) * 70 + Math.cos(i * 1.2) * 25))
  );
  return (
    <div className="flex items-end gap-px" style={{ height: 48, flex: 1 }}>
      {heights.current.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            backgroundColor: active ? '#C9A84C' : '#2a2a2a',
            borderRadius: 1,
            transition: 'background-color 0.3s',
          }}
        />
      ))}
    </div>
  );
}

// ── Upload progress overlay ──
function UploadProgress({ progress, label }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(17,17,17,0.95)' }}>
      <p className="text-xs font-light tracking-widest mb-6" style={{ color: '#C9A84C', letterSpacing: '0.2em' }}>VLOGER</p>
      <p className="text-xs font-light mb-5" style={{ color: '#555', letterSpacing: '0.08em' }}>{label}</p>
      <div className="w-48 h-px" style={{ backgroundColor: '#1e1e1e' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: '#C9A84C' }}
        />
      </div>
      <p className="text-xs font-light mt-3 tabular-nums" style={{ color: '#444' }}>{progress}%</p>
    </div>
  );
}

export default function CreatePost() {
  const { type } = useParams();
  const navigate = useNavigate();
  const isVlog = type === 'vlog';

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState('public');

  // Vlog
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);

  // Voice
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  // State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  const videoFileInputRef = useRef(null);
  const thumbFileInputRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, []);

  // ── Video ──
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { setError('Fichier trop lourd (max 500 Mo)'); return; }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setError('');
    // Extract duration
    const vid = document.createElement('video');
    vid.src = url;
    vid.onloadedmetadata = () => setVideoDuration(Math.round(vid.duration));
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setVideoDuration(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  };

  // ── Recording ──
  const startRecording = async () => {
    setError('');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Accès au microphone refusé. Autorise-le dans les paramètres du navigateur.");
      return;
    }
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
    };
    mr.start(100);
    mediaRecorderRef.current = mr;
    setRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const resetAudio = () => {
    setAudioBlob(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    setRecordingTime(0);
    setPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setError('');
    if (!title.trim() && !description.trim()) { setError("Ajoute au moins un titre ou une description."); return; }
    if (isVlog && !videoFile) { setError("Sélectionne une vidéo à publier."); return; }
    if (!isVlog && !audioBlob) { setError("Enregistre un message vocal avant de publier."); return; }

    setUploading(true);
    setUploadProgress(5);

    try {
      const me = await getUser();
      const profiles = await dbFilter('profiles', { user_id: me.id });
      const profile = profiles[0] || null;
      const tags = hashtags.split(/[\s,#]+/).filter(Boolean);

      let uploadedVideoUrl = null;
      let uploadedAudioUrl = null;
      let uploadedThumbUrl = null;

      if (isVlog && videoFile) {
        setUploadLabel('Upload de la vidéo...');
        setUploadProgress(15);
        uploadedVideoUrl = await uploadFile(videoFile, 'videos');
        setUploadProgress(60);

        if (thumbnailFile) {
          setUploadLabel('Upload de la miniature...');
          uploadedThumbUrl = await uploadFile(thumbnailFile, 'thumbnails');
          setUploadProgress(75);
        }
      }

      if (!isVlog && audioBlob) {
        setUploadLabel('Upload du message vocal...');
        setUploadProgress(30);
        const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
        uploadedAudioUrl = await uploadFile(file, 'audio');
        setUploadProgress(75);
      }

      setUploadLabel('Publication en cours...');
      setUploadProgress(88);

      const postData = {
        author_id: me.id,
        author_name: profile?.display_name || me.user_metadata?.full_name || 'Vloger',
        author_username: profile?.username || me.email?.split('@')[0] || 'user',
        author_avatar: profile?.avatar_url || null,
        author_verified: profile?.verified || false,
        type: isVlog ? 'vlog' : 'voice',
        title: title.trim() || null,
        description: description.trim() || null,
        video_url: uploadedVideoUrl,
        audio_url: uploadedAudioUrl,
        thumbnail_url: uploadedThumbUrl || null,
        cover_image_url: uploadedThumbUrl || null,
        hashtags: tags,
        location: location.trim() || null,
        visibility,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
        duration: isVlog ? videoDuration : recordingTime,
      };

      await dbCreate('posts', postData);

      if (profile) {
        await dbUpdate('profiles', profile.id, {
          posts_count: (profile.posts_count || 0) + 1,
        }).catch(() => {});
      }

      setUploadProgress(100);
      setUploadLabel('Publié !');
      setSuccess(true);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setUploading(false);
      setUploadProgress(0);
      setError(err?.message || 'Erreur lors de la publication. Réessaie.');
    }
  };

  if (uploading) return <UploadProgress progress={uploadProgress} label={uploadLabel} />;

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 sticky top-0 z-10" style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: '#111111' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#555' }}>
          <ArrowLeft size={18} strokeWidth={1.2} />
        </button>
        <p className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.15em' }}>
          {isVlog ? 'NOUVEAU VLOG' : 'VOICE POST'}
        </p>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-1.5 text-xs font-light"
          style={{ color: '#C9A84C', letterSpacing: '0.1em' }}
        >
          PUBLIER
        </button>
      </div>

      <div className="px-6 py-6 space-y-7">
        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3" style={{ border: '1px solid #5a1a1a', backgroundColor: '#1a0a0a', borderRadius: 2 }}>
            <AlertCircle size={14} strokeWidth={1.2} style={{ color: '#cc5555', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs font-light" style={{ color: '#cc6666' }}>{error}</p>
          </div>
        )}

        {/* ── VLOG: Video upload ── */}
        {isVlog && (
          <div className="space-y-3">
            {/* Video zone */}
            <div
              className="relative cursor-pointer overflow-hidden"
              style={{ aspectRatio: '16/9', border: `1px solid ${videoFile ? '#C9A84C22' : '#2a2a2a'}`, borderRadius: 2, backgroundColor: '#0d0d0d' }}
              onClick={() => !videoFile && videoFileInputRef.current?.click()}
            >
              {videoPreview ? (
                <>
                  <video
                    src={videoPreview}
                    className="w-full h-full object-cover"
                    controls
                    style={{ display: 'block' }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); clearVideo(); }}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid #444' }}
                  >
                    <X size={12} strokeWidth={1.5} style={{ color: '#fff' }} />
                  </button>
                  {videoDuration && (
                    <div className="absolute bottom-2.5 left-2.5 text-xs font-light tabular-nums px-2 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#C9A84C', fontSize: '10px' }}>
                      {fmtTime(videoDuration)}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ border: '1px solid #2a2a2a' }}>
                    <Upload size={18} strokeWidth={1} style={{ color: '#555' }} />
                  </div>
                  <p className="text-xs font-light" style={{ color: '#555', letterSpacing: '0.1em' }}>IMPORTER UNE VIDÉO</p>
                  <p className="text-xs font-light" style={{ color: '#333', fontSize: '10px' }}>MP4, MOV, AVI — max 500 Mo</p>
                </div>
              )}
              <input ref={videoFileInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
            </div>

            {/* Thumbnail picker */}
            {videoFile && (
              <button
                onClick={() => thumbFileInputRef.current?.click()}
                className="flex items-center gap-3 w-full px-4 py-3"
                style={{ border: '1px solid #2a2a2a', borderRadius: 2 }}
              >
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="" className="w-10 h-6 object-cover rounded" style={{ opacity: 0.9 }} />
                ) : (
                  <div className="w-10 h-6 flex items-center justify-center" style={{ backgroundColor: '#1a1a1a', borderRadius: 2 }}>
                    <Image size={12} strokeWidth={1} style={{ color: '#555' }} />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-xs font-light text-white">{thumbnailPreview ? 'Changer la miniature' : 'Ajouter une miniature'}</p>
                  <p style={{ color: '#444', fontSize: '10px' }}>Optionnel · Image JPG ou PNG</p>
                </div>
                {thumbnailPreview && <CheckCircle size={12} strokeWidth={1.2} style={{ color: '#C9A84C' }} />}
                <input ref={thumbFileInputRef} type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
              </button>
            )}
          </div>
        )}

        {/* ── VOICE: Recorder ── */}
        {!isVlog && (
          <div className="flex flex-col items-center py-10" style={{ border: '1px solid #1e1e1e', borderRadius: 2 }}>
            {/* Recording */}
            {recording && (
              <div className="w-full px-8 flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: '1px solid #C9A84C55' }}>
                    <Mic size={22} strokeWidth={1} style={{ color: '#C9A84C' }} />
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '1px solid #C9A84C22' }} />
                </div>
                <p className="text-2xl font-thin tabular-nums" style={{ color: '#C9A84C', fontWeight: 200, letterSpacing: '0.1em' }}>
                  {fmtTime(recordingTime)}
                </p>
                <div className="w-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: '#C9A84C' }} />
                  <Waveform active bars={30} />
                </div>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-light tracking-wider mt-2"
                  style={{ border: '1px solid #C9A84C44', color: '#C9A84C', letterSpacing: '0.1em', borderRadius: 2 }}
                >
                  <Square size={11} strokeWidth={1.5} /> ARRÊTER
                </button>
              </div>
            )}

            {/* Recorded — playback */}
            {!recording && audioBlob && (
              <div className="w-full px-8 flex flex-col items-center gap-4">
                <div className="w-full flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: '1px solid #C9A84C44', backgroundColor: '#1a1a1a' }}
                  >
                    {playing
                      ? <Pause size={14} strokeWidth={1.2} style={{ color: '#C9A84C' }} />
                      : <Play size={14} strokeWidth={1.2} style={{ color: '#C9A84C', marginLeft: 2 }} />
                    }
                  </button>
                  <Waveform active={playing} bars={34} />
                  <span className="text-xs font-light tabular-nums flex-shrink-0" style={{ color: '#555' }}>{fmtTime(recordingTime)}</span>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setPlaying(false)}
                  style={{ display: 'none' }}
                />
                <div className="flex items-center gap-4">
                  <CheckCircle size={13} strokeWidth={1.2} style={{ color: '#C9A84C' }} />
                  <span className="text-xs font-light" style={{ color: '#666' }}>Enregistrement prêt</span>
                  <button onClick={resetAudio} className="text-xs font-light" style={{ color: '#555', letterSpacing: '0.06em' }}>
                    RECOMMENCER
                  </button>
                </div>
              </div>
            )}

            {/* Idle — start */}
            {!recording && !audioBlob && (
              <div className="flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: '1px solid #2a2a2a' }}>
                  <Mic size={22} strokeWidth={1} style={{ color: '#555' }} />
                </div>
                <button
                  onClick={startRecording}
                  className="px-6 py-2.5 text-xs font-light tracking-wider"
                  style={{ border: '1px solid #C9A84C55', color: '#C9A84C', letterSpacing: '0.1em', borderRadius: 2 }}
                >
                  DÉMARRER L'ENREGISTREMENT
                </button>
                <p className="text-xs font-light text-center" style={{ color: '#333', fontSize: '10px' }}>
                  Autorise l'accès au microphone dans ton navigateur
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Fields ── */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>TITRE *</label>
            <input
              type="text"
              placeholder={isVlog ? 'Mon premier vlog...' : 'Titre du message vocal...'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              className="w-full py-3 px-0 text-sm font-light text-white outline-none"
              style={inputStyle}
            />
            <div className="flex justify-end mt-1">
              <span style={{ color: '#333', fontSize: '10px' }}>{title.length}/120</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>DESCRIPTION</label>
            <textarea
              placeholder="Décris ton contenu..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full py-2 px-0 text-sm font-light text-white outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
              <Hash size={10} strokeWidth={1.5} className="inline mr-1" />HASHTAGS
            </label>
            <input
              type="text"
              placeholder="voyage lifestyle musique..."
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              className="w-full py-3 px-0 text-sm font-light text-white outline-none"
              style={inputStyle}
            />
            {hashtags.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {hashtags.split(/[\s,#]+/).filter(Boolean).map((t, i) => (
                  <span key={i} className="text-xs font-light px-2 py-0.5" style={{ backgroundColor: '#C9A84C15', color: '#C9A84C', borderRadius: 2, fontSize: '10px' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
              <MapPin size={10} strokeWidth={1.5} className="inline mr-1" />LOCALISATION
            </label>
            <input
              type="text"
              placeholder="Paris, France"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full py-3 px-0 text-sm font-light text-white outline-none"
              style={inputStyle}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-light mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
              <Eye size={10} strokeWidth={1.5} className="inline mr-1" />VISIBILITÉ
            </label>
            <div className="flex gap-2">
              {[
                { value: 'public', label: 'PUBLIC' },
                { value: 'followers', label: 'ABONNÉS' },
                { value: 'private', label: 'PRIVÉ' },
              ].map(v => (
                <button
                  key={v.value}
                  onClick={() => setVisibility(v.value)}
                  className="flex-1 py-2.5 text-xs font-light"
                  style={{
                    border: `1px solid ${visibility === v.value ? '#C9A84C55' : '#2a2a2a'}`,
                    color: visibility === v.value ? '#C9A84C' : '#555',
                    backgroundColor: visibility === v.value ? '#C9A84C0a' : 'transparent',
                    letterSpacing: '0.06em',
                    borderRadius: 2,
                    transition: 'all 0.15s',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Publish button ── */}
        <button
          onClick={handleSubmit}
          className="w-full py-4 flex items-center justify-center gap-2 text-xs font-light tracking-widest"
          style={{ backgroundColor: '#C9A84C', borderRadius: 2, color: '#111111', letterSpacing: '0.15em' }}
        >
          {success ? <CheckCircle size={14} strokeWidth={1.5} /> : null}
          {success ? 'PUBLIÉ !' : isVlog ? 'PUBLIER LE VLOG' : 'PUBLIER LE VOICE POST'}
        </button>
      </div>
    </div>
  );
}
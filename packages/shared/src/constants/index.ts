export const COLORS = {
  gold: '#C9A84C',
  goldDim: '#8a6f32',
  black: '#111111',
  blackSecondary: '#1a1a1a',
  blackTertiary: '#222222',
  border: '#2a2a2a',
  borderLight: '#1e1e1e',
  textPrimary: '#ffffff',
  textSecondary: '#777777',
  textMuted: '#555555',
  textDim: '#444444',
  green: '#22c55e',
  red: '#cc6666',
} as const;

export const STORAGE_BUCKETS = {
  uploads: 'uploads',
  avatars: 'avatars',
  videos: 'videos',
  audio: 'audio',
} as const;

export const TABLES = {
  profiles: 'profiles',
  posts: 'posts',
  comments: 'comments',
  likes: 'likes',
  follows: 'follows',
  conversations: 'conversations',
  messages: 'messages',
  notifications: 'notifications',
} as const;

export const REALTIME_CHANNELS = {
  presence: 'vloger:presence',
  messages: (id: string) => `messages:${id}`,
  conversations: (userId: string) => `convs:${userId}`,
  layout: (userId: string) => `layout:${userId}`,
} as const;

export const PAGINATION = {
  feedLimit: 30,
  messagesLimit: 100,
  notificationsLimit: 50,
  searchLimit: 20,
  profilePostsLimit: 30,
} as const;

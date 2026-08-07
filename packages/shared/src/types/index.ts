// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  website?: string;
  city?: string;
  country?: string;
  verified?: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  likes_received?: number;
  created_date?: string;
  updated_date?: string;
}

// ── Post ──────────────────────────────────────────────────────────────────────

export type PostType = 'vlog' | 'voice';

export interface Post {
  id: string;
  author_id: string;
  author_name?: string;
  author_username?: string;
  author_avatar?: string;
  author_verified?: boolean;
  type: PostType;
  title?: string;
  description?: string;
  hashtags?: string[];
  video_url?: string;
  audio_url?: string;
  thumbnail_url?: string;
  duration?: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  created_date: string;
  updated_date?: string;
}

// ── Comment ───────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author_name?: string;
  author_username?: string;
  author_avatar?: string;
  content: string;
  likes_count: number;
  created_date: string;
}

// ── Like ──────────────────────────────────────────────────────────────────────

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_date: string;
}

// ── Follow ────────────────────────────────────────────────────────────────────

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_date: string;
}

// ── Conversation ──────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participant_ids: string[];
  participant_names?: string[];
  participant_avatars?: (string | null)[];
  is_group?: boolean;
  group_name?: string;
  group_avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_date?: string;
  updated_date?: string;
}

// ── Message ───────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'voice';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  type: MessageType;
  image_url?: string;
  audio_url?: string;
  duration?: number;
  read?: boolean;
  created_date: string;
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'message';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  actor_name?: string;
  actor_avatar?: string;
  type: NotificationType;
  post_id?: string;
  post_thumbnail?: string;
  message?: string;
  read: boolean;
  created_date: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export interface CreateNotificationParams {
  userId: string;
  actorId: string;
  actorName?: string;
  actorAvatar?: string | null;
  type: NotificationType;
  postId?: string;
  postThumbnail?: string;
  message?: string;
}

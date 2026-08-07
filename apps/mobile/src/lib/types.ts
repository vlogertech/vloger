// Types locaux mobile — miroir des types partagés sans dépendance au package

export interface Post {
  id: string;
  author_id: string;
  author_name?: string;
  author_username?: string;
  author_avatar?: string;
  type: 'vlog' | 'voice';
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
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  type: 'text' | 'image' | 'voice';
  image_url?: string;
  audio_url?: string;
  duration?: number;
  read?: boolean;
  created_date: string;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  participant_names?: string[];
  participant_avatars?: (string | null)[];
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  actor_name?: string;
  actor_avatar?: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message';
  post_id?: string;
  message?: string;
  read: boolean;
  created_date: string;
}

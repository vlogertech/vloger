import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Post, Profile, Comment, Conversation, Message,
  Notification, CreateNotificationParams,
} from '../types/index.js';

const applyOrder = (q: any, order?: string) => {
  if (!order) return q;
  const asc = !order.startsWith('-');
  return q.order(asc ? order : order.slice(1), { ascending: asc });
};

export const createDbService = (supabase: SupabaseClient) => ({

  // ── Auth ────────────────────────────────────────────────────────────────────

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // ── Generic CRUD ────────────────────────────────────────────────────────────

  list: async <T = any>(table: string, order?: string, limit = 20): Promise<T[]> => {
    let q = supabase.from(table).select('*');
    if (limit) q = q.limit(limit);
    if (order) q = applyOrder(q, order);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  },

  filter: async <T = any>(table: string, filters: Record<string, any>, order?: string, limit?: number): Promise<T[]> => {
    let q = supabase.from(table).select('*');
    Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
    if (order) q = applyOrder(q, order);
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  },

  create: async <T = any>(table: string, data: Record<string, any>): Promise<T> => {
    const { data: row, error } = await supabase.from(table).insert(data).select().single();
    if (error) throw error;
    return row as T;
  },

  update: async <T = any>(table: string, id: string, data: Record<string, any>): Promise<T> => {
    const { data: row, error } = await supabase.from(table).update(data).eq('id', id).select().single();
    if (error) throw error;
    return row as T;
  },

  delete: async <T = any>(table: string, id: string): Promise<T> => {
    const { data, error } = await supabase.from(table).delete().eq('id', id).select().single();
    if (error) throw error;
    return data as T;
  },

  // ── Likes ───────────────────────────────────────────────────────────────────

  toggleLike: async (postId: string, userId: string): Promise<boolean> => {
    const { data: existing } = await supabase
      .from('likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
      return false;
    }
    await supabase.from('likes').insert({ post_id: postId, user_id: userId });
    return true;
  },

  getLikeStatus: async (postId: string, userId: string): Promise<boolean> => {
    if (!userId) return false;
    const { data } = await supabase
      .from('likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    return !!data;
  },

  // ── Conversations ────────────────────────────────────────────────────────────

  findOrCreateConversation: async (
    myId: string, otherId: string, myName: string, otherProfile: Partial<Profile>
  ): Promise<Conversation> => {
    const { data: existing } = await supabase
      .from('conversations').select('*').contains('participant_ids', [myId, otherId]).limit(10);
    const found = (existing ?? []).find(
      (c: Conversation) => c.participant_ids?.length === 2 &&
        c.participant_ids.includes(myId) && c.participant_ids.includes(otherId)
    );
    if (found) return found;
    const { data: created, error } = await supabase.from('conversations').insert({
      participant_ids: [myId, otherId],
      participant_names: [myName, otherProfile?.display_name || otherProfile?.username || 'Utilisateur'],
      participant_avatars: [null, otherProfile?.avatar_url || null],
      unread_count: 0,
    }).select().single();
    if (error) throw error;
    return created as Conversation;
  },

  // ── Notifications ────────────────────────────────────────────────────────────

  createNotification: async (params: CreateNotificationParams): Promise<void> => {
    if (params.userId === params.actorId) return;
    await supabase.from('notifications').insert({
      user_id: params.userId,
      actor_id: params.actorId,
      actor_name: params.actorName,
      actor_avatar: params.actorAvatar,
      type: params.type,
      post_id: params.postId || null,
      post_thumbnail: params.postThumbnail || null,
      message: params.message || null,
    });
  },

  // ── Storage ──────────────────────────────────────────────────────────────────

  /**
   * Upload un fichier dans le bucket donné, scopé au dossier de l'utilisateur
   * connecté ({user_id}/{id-unique}-{nom-assaini}). Ce scoping est requis par
   * la policy RLS storage (auth.uid() = owner sur update/delete) et évite
   * toute collision de nom entre deux utilisateurs.
   */
  uploadFile: async (file: File | Blob, bucket = 'uploads'): Promise<string> => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Utilisateur non authentifié.');

    const rawName = (file as File).name || 'file';
    const parts = rawName.split('.');
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const base = parts
      .join('.')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '')
      .slice(0, 60);
    const safeName = ext ? `${base || 'file'}.${ext}` : base || 'file';
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${user.id}/${uniqueId}-${safeName}`;

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  },

  // ── Realtime ─────────────────────────────────────────────────────────────────

  subscribeToMessages: (conversationId: string, callback: (msg: Message) => void) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => callback(payload.new as Message))
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  /**
   * Supabase Realtime ne permet pas de filtrer côté serveur sur une colonne
   * tableau (participant_ids) via la syntaxe `filter` du channel. La
   * sécurité est garantie par la policy RLS `conversations_select`
   * (appliquée par Supabase avant l'envoi de l'événement) ; on ajoute ici
   * un filtre défensif côté client en complément.
   */
  subscribeToConversations: (userId: string, callback: (row: Conversation) => void) => {
    const channel = supabase
      .channel(`convs:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
      }, (payload) => {
        const row = payload.new as Conversation;
        if (!row?.participant_ids?.includes(userId)) return;
        callback(row);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  subscribeToNotifications: (userId: string, callback: () => void) => {
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
});

export type DbService = ReturnType<typeof createDbService>;
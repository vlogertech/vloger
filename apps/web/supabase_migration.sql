-- ============================================================
-- VLOGER — Migration Supabase complète
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: profiles
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text,
  avatar_url    text,
  banner_url    text,
  bio           text,
  website       text,
  country       text,
  city          text,
  verified      boolean not null default false,
  badge_type    text not null default 'none' check (badge_type in ('none','creator','journalist','business','identity')),
  followers_count  integer not null default 0,
  following_count  integer not null default 0,
  posts_count      integer not null default 0,
  likes_received   integer not null default 0,
  views_total      integer not null default 0,
  is_private    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE: posts
-- ============================================================
create table if not exists public.posts (
  id               uuid primary key default uuid_generate_v4(),
  author_id        uuid not null references auth.users(id) on delete cascade,
  author_name      text,
  author_username  text,
  author_avatar    text,
  author_verified  boolean not null default false,
  type             text not null default 'vlog' check (type in ('vlog','voice')),
  title            text,
  description      text,
  video_url        text,
  audio_url        text,
  thumbnail_url    text,
  cover_image_url  text,
  hashtags         text[] default '{}',
  mentions         text[] default '{}',
  location         text,
  duration         integer,
  likes_count      integer not null default 0,
  comments_count   integer not null default 0,
  shares_count     integer not null default 0,
  views_count      integer not null default 0,
  visibility       text not null default 'public' check (visibility in ('public','followers','private')),
  comments_enabled boolean not null default true,
  download_allowed boolean not null default false,
  transcription    text,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now()
);

-- ============================================================
-- TABLE: comments
-- ============================================================
create table if not exists public.comments (
  id               uuid primary key default uuid_generate_v4(),
  post_id          uuid not null references public.posts(id) on delete cascade,
  author_id        uuid not null references auth.users(id) on delete cascade,
  author_name      text,
  author_username  text,
  author_avatar    text,
  content          text,
  audio_url        text,
  type             text not null default 'text' check (type in ('text','voice')),
  likes_count      integer not null default 0,
  parent_id        uuid references public.comments(id) on delete cascade,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now()
);

-- ============================================================
-- TABLE: likes
-- ============================================================
create table if not exists public.likes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

-- ============================================================
-- TABLE: follows
-- ============================================================
create table if not exists public.follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(follower_id, following_id)
);

-- ============================================================
-- TABLE: conversations
-- ============================================================
create table if not exists public.conversations (
  id                  uuid primary key default uuid_generate_v4(),
  participant_ids     uuid[] not null,
  participant_names   text[] default '{}',
  participant_avatars text[] default '{}',
  last_message        text,
  last_message_time   timestamptz,
  unread_count        integer not null default 0,
  is_group            boolean not null default false,
  group_name          text,
  group_avatar        text,
  created_date        timestamptz not null default now(),
  updated_date        timestamptz not null default now()
);

-- ============================================================
-- TABLE: messages
-- ============================================================
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  sender_name     text,
  sender_avatar   text,
  content         text default '',
  audio_url       text,
  image_url       text,
  type            text not null default 'text' check (type in ('text','voice','image')),
  read            boolean not null default false,
  created_date    timestamptz not null default now(),
  updated_date    timestamptz not null default now()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
create table if not exists public.notifications (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  actor_id       uuid references auth.users(id) on delete set null,
  actor_name     text,
  actor_avatar   text,
  type           text not null check (type in ('like','comment','follow','mention','share','reply')),
  post_id        uuid references public.posts(id) on delete cascade,
  post_thumbnail text,
  message        text,
  read           boolean not null default false,
  created_date   timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_posts_author_id      on public.posts(author_id);
create index if not exists idx_posts_created_date   on public.posts(created_date desc);
create index if not exists idx_posts_visibility     on public.posts(visibility);
create index if not exists idx_comments_post_id     on public.comments(post_id);
create index if not exists idx_follows_follower     on public.follows(follower_id);
create index if not exists idx_follows_following    on public.follows(following_id);
create index if not exists idx_messages_conv_id     on public.messages(conversation_id);
create index if not exists idx_messages_created     on public.messages(created_date asc);
create index if not exists idx_notifications_user   on public.notifications(user_id);
create index if not exists idx_notifications_read   on public.notifications(user_id, read);
create index if not exists idx_likes_post_id        on public.likes(post_id);
create index if not exists idx_profiles_user_id     on public.profiles(user_id);
create index if not exists idx_profiles_username    on public.profiles(username);

-- ============================================================
-- TRIGGER: updated_at auto-update
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

create or replace trigger trg_posts_updated
  before update on public.posts
  for each row execute function public.set_updated_at();

create or replace trigger trg_comments_updated
  before update on public.comments
  for each row execute function public.set_updated_at();

create or replace trigger trg_conversations_updated
  before update on public.conversations
  for each row execute function public.set_updated_at();

create or replace trigger trg_messages_updated
  before update on public.messages
  for each row execute function public.set_updated_at();

-- updated_at pour profiles (colonne différente)
create or replace function public.set_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: likes_count auto-increment/decrement
-- ============================================================
create or replace function public.handle_like_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    update public.profiles set likes_received = likes_received + 1
      where user_id = (select author_id from public.posts where id = new.post_id);
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    update public.profiles set likes_received = greatest(0, likes_received - 1)
      where user_id = (select author_id from public.posts where id = old.post_id);
  end if;
  return null;
end;
$$;

create or replace trigger trg_likes_count
  after insert or delete on public.likes
  for each row execute function public.handle_like_change();

-- ============================================================
-- TRIGGER: followers/following count
-- ============================================================
create or replace function public.handle_follow_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set followers_count = followers_count + 1 where user_id = new.following_id;
    update public.profiles set following_count = following_count + 1 where user_id = new.follower_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set followers_count = greatest(0, followers_count - 1) where user_id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where user_id = old.follower_id;
  end if;
  return null;
end;
$$;

create or replace trigger trg_follow_count
  after insert or delete on public.follows
  for each row execute function public.handle_follow_change();

-- ============================================================
-- TRIGGER: comments_count auto-increment/decrement
-- ============================================================
create or replace function public.handle_comment_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace trigger trg_comments_count
  after insert or delete on public.comments
  for each row execute function public.handle_comment_change();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.comments      enable row level security;
alter table public.likes         enable row level security;
alter table public.follows       enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;

-- ── profiles ──
create policy "profiles_select_all"   on public.profiles for select using (true);
create policy "profiles_insert_own"   on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own"   on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own"   on public.profiles for delete using (auth.uid() = user_id);

-- ── posts ──
create policy "posts_select_public"   on public.posts for select using (visibility = 'public' or auth.uid() = author_id);
create policy "posts_insert_own"      on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_update_own"      on public.posts for update using (auth.uid() = author_id);
create policy "posts_delete_own"      on public.posts for delete using (auth.uid() = author_id);

-- ── comments ──
create policy "comments_select_all"   on public.comments for select using (true);
create policy "comments_insert_auth"  on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_update_own"   on public.comments for update using (auth.uid() = author_id);
create policy "comments_delete_own"   on public.comments for delete using (auth.uid() = author_id);

-- ── likes ──
create policy "likes_select_all"      on public.likes for select using (true);
create policy "likes_insert_own"      on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own"      on public.likes for delete using (auth.uid() = user_id);

-- ── follows ──
create policy "follows_select_all"    on public.follows for select using (true);
create policy "follows_insert_own"    on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own"    on public.follows for delete using (auth.uid() = follower_id);

-- ── conversations ──
create policy "conversations_select"  on public.conversations for select using (auth.uid() = any(participant_ids));
create policy "conversations_insert"  on public.conversations for insert with check (auth.uid() = any(participant_ids));
create policy "conversations_update"  on public.conversations for update using (auth.uid() = any(participant_ids));
create policy "conversations_delete"  on public.conversations for delete using (auth.uid() = any(participant_ids));

-- ── messages ──
create policy "messages_select"       on public.messages for select using (
  auth.uid() in (
    select unnest(participant_ids) from public.conversations where id = conversation_id
  )
);
create policy "messages_insert"       on public.messages for insert with check (auth.uid() = sender_id);
create policy "messages_update_own"   on public.messages for update using (auth.uid() = sender_id);
create policy "messages_delete_own"   on public.messages for delete using (auth.uid() = sender_id);

-- ── notifications ──
create policy "notifications_select"  on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update"  on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_delete"  on public.notifications for delete using (auth.uid() = user_id);
-- insert via service role only (triggers/functions)
create policy "notifications_insert"  on public.notifications for insert with check (true);

-- ============================================================
-- REALTIME: activer les tables
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.posts;

-- ============================================================
-- STORAGE BUCKETS
-- (à créer aussi via Dashboard > Storage si cette commande échoue)
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('uploads',    'uploads',    true),
  ('videos',     'videos',     true),
  ('audio',      'audio',      true),
  ('thumbnails', 'thumbnails', true),
  ('avatars',    'avatars',    true),
  ('banners',    'banners',    true)
on conflict (id) do nothing;

-- Storage policies
create policy "storage_uploads_select"  on storage.objects for select using (bucket_id in ('uploads','videos','audio','thumbnails','avatars','banners'));
create policy "storage_uploads_insert"  on storage.objects for insert with check (auth.uid() is not null and bucket_id in ('uploads','videos','audio','thumbnails','avatars','banners'));
create policy "storage_uploads_update"  on storage.objects for update using (auth.uid() is not null);
create policy "storage_uploads_delete"  on storage.objects for delete using (auth.uid() is not null);

-- ==============================================================================
-- Jotdown! COMPLETE & ALL-IN-ONE SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- ==========================================
-- 0. EXHAUSTIVE AUTH TRIGGER CLEANUP (Fixes Auth 500 errors)
-- ==========================================
DO $$
DECLARE
    trg_record RECORD;
BEGIN
    FOR trg_record IN 
        SELECT tgname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
        WHERE pg_namespace.nspname = 'auth' AND pg_class.relname = 'users'
        AND tgisinternal = false
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trg_record.tgname) || ' ON auth.users;';
    END LOOP;
END $$;

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 2. TABLES DEFINITIONS
-- ==========================================

-- User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Personal & Public Notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT,
    content TEXT,
    reminder_at TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT false,
    author_name TEXT,
    author_avatar TEXT,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}'::TEXT[],
    is_trashed BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Shared Feeds (Channels)
CREATE TABLE IF NOT EXISTS public.feeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feed Members (Collaborators)
CREATE TABLE IF NOT EXISTS public.feed_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users, 
    invited_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(feed_id, invited_email)
);

-- Feed Notes (Notes inside Channels)
CREATE TABLE IF NOT EXISTS public.feed_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users NOT NULL,
    author_email TEXT NOT NULL,
    title TEXT,
    content TEXT,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feed Acknowledgments (Seen/Acknowledged by member)
CREATE TABLE IF NOT EXISTS public.feed_acknowledgments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_note_id UUID REFERENCES public.feed_notes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    user_name TEXT,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(feed_note_id, user_id)
);

-- Community Note Likes
CREATE TABLE IF NOT EXISTS public.note_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(note_id, user_id)
);

-- Community Note Comments
CREATE TABLE IF NOT EXISTS public.note_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. REALTIME REPLICATION SETUP
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feeds') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feeds;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feed_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feed_notes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_notes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feed_acknowledgments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_acknowledgments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'note_likes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.note_likes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'note_comments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.note_comments;
    END IF;
END $$;

ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.feeds REPLICA IDENTITY FULL;
ALTER TABLE public.feed_members REPLICA IDENTITY FULL;
ALTER TABLE public.feed_notes REPLICA IDENTITY FULL;
ALTER TABLE public.feed_acknowledgments REPLICA IDENTITY FULL;
ALTER TABLE public.note_likes REPLICA IDENTITY FULL;
ALTER TABLE public.note_comments REPLICA IDENTITY FULL;

-- ==========================================
-- 4. SECURITY FUNCTIONS (To Break RLS Recursion)
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_is_feed_member(f_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.feed_members WHERE feed_id = f_id AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_feed_owner(f_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.feeds WHERE id = f_id AND owner_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Notes Policies
DROP POLICY IF EXISTS "Users manage own notes" ON public.notes;
CREATE POLICY "Users manage own notes" ON public.notes FOR ALL 
USING (auth.uid() = user_id OR is_public = true);

-- Feeds Policies
DROP POLICY IF EXISTS "Owners manage feeds" ON public.feeds;
CREATE POLICY "Owners manage feeds" ON public.feeds FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members view feeds" ON public.feeds;
CREATE POLICY "Members view feeds" ON public.feeds FOR SELECT USING (public.check_is_feed_member(id));

-- Feed Members Policies
DROP POLICY IF EXISTS "Owners manage members" ON public.feed_members;
CREATE POLICY "Owners manage members" ON public.feed_members FOR ALL USING (public.check_is_feed_owner(feed_id));

DROP POLICY IF EXISTS "Users view own memberships" ON public.feed_members;
CREATE POLICY "Users view own memberships" ON public.feed_members FOR SELECT 
USING (user_id = auth.uid() OR invited_email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Accept invites" ON public.feed_members;
CREATE POLICY "Accept invites" ON public.feed_members FOR UPDATE 
USING (invited_email = auth.jwt()->>'email');

-- Feed Notes Policies
DROP POLICY IF EXISTS "Access feed notes" ON public.feed_notes;
CREATE POLICY "Access feed notes" ON public.feed_notes FOR ALL 
USING (public.check_is_feed_owner(feed_id) OR public.check_is_feed_member(feed_id));

-- Acknowledgments Policies
DROP POLICY IF EXISTS "View feed acknowledgments" ON public.feed_acknowledgments;
CREATE POLICY "View feed acknowledgments" ON public.feed_acknowledgments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.feed_notes fn
        WHERE fn.id = feed_acknowledgments.feed_note_id
        AND (public.check_is_feed_owner(fn.feed_id) OR public.check_is_feed_member(fn.feed_id))
    )
);

DROP POLICY IF EXISTS "Manage own acknowledgments" ON public.feed_acknowledgments;
CREATE POLICY "Manage own acknowledgments" ON public.feed_acknowledgments FOR ALL 
USING (auth.uid() = user_id);

-- Note Likes Policies
DROP POLICY IF EXISTS "View note likes" ON public.note_likes;
CREATE POLICY "View note likes" ON public.note_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage own note likes" ON public.note_likes;
CREATE POLICY "Manage own note likes" ON public.note_likes FOR ALL USING (auth.uid() = user_id);

-- Note Comments Policies
DROP POLICY IF EXISTS "View note comments" ON public.note_comments;
CREATE POLICY "View note comments" ON public.note_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage own note comments" ON public.note_comments;
CREATE POLICY "Manage own note comments" ON public.note_comments FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 6. MIGRATIONS FOR EXISTING DATA (Safe Run)
-- ==========================================

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE public.feed_notes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.feed_notes ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::TEXT[];

-- Backfill: sync single image_url into image_urls array
UPDATE public.notes 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL 
  AND (image_urls IS NULL OR cardinality(image_urls) = 0);

UPDATE public.feed_notes 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL 
  AND (image_urls IS NULL OR cardinality(image_urls) = 0);

-- ==========================================
-- 7. STORAGE BUCKET & STORAGE RLS POLICIES
-- ==========================================

-- Create public storage bucket for note images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'note-images',
    'note-images',
    true,
    10485760, -- 10MB per file
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Note: storage.objects already has RLS enabled by Supabase by default
-- (Do not run 'ALTER TABLE storage.objects' as it requires supabase_storage_admin owner)

DROP POLICY IF EXISTS "Public can view note images" ON storage.objects;
CREATE POLICY "Public can view note images"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-images');

DROP POLICY IF EXISTS "Authenticated users can upload note images" ON storage.objects;
CREATE POLICY "Authenticated users can upload note images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'note-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update note images" ON storage.objects;
CREATE POLICY "Authenticated users can update note images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'note-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete note images" ON storage.objects;
CREATE POLICY "Authenticated users can delete note images"
ON storage.objects FOR DELETE
USING (bucket_id = 'note-images' AND auth.role() = 'authenticated');

-- ==========================================
-- 8. DIAGNOSTIC CHECK
-- ==========================================
SELECT tgname AS active_auth_triggers FROM pg_trigger 
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
WHERE pg_namespace.nspname = 'auth' AND pg_class.relname = 'users';

-- Jotdown! DEEP CLEAN & REPAIR SQL (Auth 500 Fix)
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- ==========================================
-- 0. EXHAUSTIVE AUTH TRIGGER CLEANUP
-- ==========================================
-- This removes any and all triggers on the auth.users table 
-- that might be trying to sync to non-existent 'profiles' tables.

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
-- 1. Setup Extensions
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 2. Tables Definition
-- ==========================================

-- Personal Notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT,
    content TEXT,
    reminder_at TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT false,
    author_name TEXT,
    is_trashed BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for specific tables (Safely)
DO $$
BEGIN
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
END $$;

-- Enable REPLICA IDENTITY FULL for Realtime + RLS support
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.feeds REPLICA IDENTITY FULL;
ALTER TABLE public.feed_members REPLICA IDENTITY FULL;
ALTER TABLE public.feed_notes REPLICA IDENTITY FULL;
ALTER TABLE public.feed_acknowledgments REPLICA IDENTITY FULL;

-- Shared Feeds
CREATE TABLE IF NOT EXISTS public.feeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feed Members
CREATE TABLE IF NOT EXISTS public.feed_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users, 
    invited_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(feed_id, invited_email)
);

-- Feed Notes
CREATE TABLE IF NOT EXISTS public.feed_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users NOT NULL,
    author_email TEXT NOT NULL,
    title TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feed Acknowledgments
CREATE TABLE IF NOT EXISTS public.feed_acknowledgments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_note_id UUID REFERENCES public.feed_notes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    user_name TEXT,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(feed_note_id, user_id)
);

-- ==========================================
-- 3. Security Functions (To Break RLS Recursion)
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
-- 4. RLS Activation & Policies
-- ==========================================

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Users manage own notes" ON public.notes;
DROP POLICY IF EXISTS "Owners manage feeds" ON public.feeds;
DROP POLICY IF EXISTS "Members view feeds" ON public.feeds;
DROP POLICY IF EXISTS "Owners manage members" ON public.feed_members;
DROP POLICY IF EXISTS "Users view own memberships" ON public.feed_members;
DROP POLICY IF EXISTS "Accept invites" ON public.feed_members;
DROP POLICY IF EXISTS "Access feed notes" ON public.feed_notes;
DROP POLICY IF EXISTS "Manage own acknowledgments" ON public.feed_acknowledgments;

-- Policies
CREATE POLICY "Users manage own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Owners manage feeds" ON public.feeds FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Members view feeds" ON public.feeds FOR SELECT USING (public.check_is_feed_member(id));
CREATE POLICY "Owners manage members" ON public.feed_members FOR ALL USING (public.check_is_feed_owner(feed_id));
CREATE POLICY "Users view own memberships" ON public.feed_members FOR SELECT USING (user_id = auth.uid() OR invited_email = auth.jwt()->>'email');
CREATE POLICY "Accept invites" ON public.feed_members FOR UPDATE USING (invited_email = auth.jwt()->>'email');
CREATE POLICY "Access feed notes" ON public.feed_notes FOR ALL USING (public.check_is_feed_owner(feed_id) OR public.check_is_feed_member(feed_id));
-- Acknowledgments Policies
DROP POLICY IF EXISTS "Manage own acknowledgments" ON public.feed_acknowledgments;

CREATE POLICY "View feed acknowledgments" ON public.feed_acknowledgments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.feed_notes fn
        WHERE fn.id = feed_acknowledgments.feed_note_id
        AND (public.check_is_feed_owner(fn.feed_id) OR public.check_is_feed_member(fn.feed_id))
    )
);

CREATE POLICY "Manage own acknowledgments" ON public.feed_acknowledgments FOR ALL 
USING (auth.uid() = user_id);

-- ==========================================
-- 5. DIAGNOSTIC CHECK (Run this and report the result)
-- ==========================================
SELECT tgname AS active_auth_triggers FROM pg_trigger 
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
WHERE pg_namespace.nspname = 'auth' AND pg_class.relname = 'users';

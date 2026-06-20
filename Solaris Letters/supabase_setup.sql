-- 🌌 SQL Schema Setup for Solaris Letters (PostgreSQL / Supabase)
-- You can run this directly in the Supabase SQL Editor to initialize all tables.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. USERS TABLE ──
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY, -- Matches the Supabase Auth user ID (UUID)
    "cosmic_id" VARCHAR(255) UNIQUE NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatar_icon" VARCHAR(255),
    "cosmic_id_changes" INTEGER NOT NULL DEFAULT 0,
    "planet_type" INTEGER NOT NULL DEFAULT 0,
    "planet_hue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "orbit_radius" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. LETTERS TABLE ──
CREATE TABLE IF NOT EXISTS "letters" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "stickers" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "paper_skin" VARCHAR(255) NOT NULL DEFAULT 'parchment',
    "is_future_self" BOOLEAN NOT NULL DEFAULT false,
    "deliver_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP WITH TIME ZONE,
    "notified_at" TIMESTAMP WITH TIME ZONE,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── 3. FRIENDSHIPS TABLE ──
CREATE TABLE IF NOT EXISTS "friendships" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "friend_id" UUID NOT NULL,
    "interaction_score" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE("user_id", "friend_id"),
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── 4. FRIEND REQUESTS TABLE ──
CREATE TABLE IF NOT EXISTS "friend_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sender_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE("sender_id", "target_id"),
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── 5. PLANET ASSIGNMENTS TABLE ──
CREATE TABLE IF NOT EXISTS "planet_assignments" (
    "user_id" UUID NOT NULL,
    "friend_id" UUID NOT NULL,
    "planet_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY ("user_id", "friend_id"),
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── 6. GROUPS TABLE ──
CREATE TABLE IF NOT EXISTS "groups" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "cosmic_position" JSONB,
    "theme_color" VARCHAR(50) NOT NULL DEFAULT '#7c3aed',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── 7. GROUP MEMBERS TABLE ──
CREATE TABLE IF NOT EXISTS "group_members" (
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY ("group_id", "user_id"),
    FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── 8. GROUP MESSAGES TABLE ──
CREATE TABLE IF NOT EXISTS "group_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE,
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE
);

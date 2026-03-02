# Claude Connect — Architecture

> This document was the original design spec used to build Claude Connect. It's preserved here as a reference for contributors and anyone forking this project for their own event.

## Overview

**Claude Connect** is a progressive web app (PWA) for meetup events. It helps attendees discover, match with, and physically find like-minded people at the event — turning a large meetup into a space for meaningful connections.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase + Vercel

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [User Journey](#2-user-journey)
3. [Data Model](#3-data-model)
4. [Feature Specifications](#4-feature-specifications)
5. [API Routes](#5-api-routes)
6. [Claude AI Integration](#6-claude-ai-integration)
7. [Real-time & Push Notifications](#7-real-time--push-notifications)
8. [Design System](#8-design-system)
9. [PWA Configuration](#9-pwa-configuration)
10. [Build Plan (3-Day Sprint)](#10-build-plan-3-day-sprint)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [File Structure](#12-file-structure)
13. [Edge Cases & Constraints](#13-edge-cases--constraints)

---

## 1. Core Concepts

### Matching Engine
Attendees register with their name, role, interests, skills, and optionally their `claude.md` file content. Claude analyses profiles and generates:
- **Match scores** (0-100) between user pairs
- **Match reasons** — a one-liner explaining why two people should meet
- **Conversation starters** — a specific question or topic to kick off a real conversation

### Beacon Mode
A full-screen, color-coded card on the user's phone that acts as a visual identifier in the venue. When activated, it notifies all matched users that the person is "live" and looking to connect.

### Claude Titles
AI-generated fun titles based on a user's profile (e.g., "The MCP Whisperer", "Agent Herder", "Vibe Coder Supreme"). Displayed prominently on profiles and Beacon screens.

### Wave System
A lightweight "interested in meeting you" signal. Mutual waves unlock contact info exchange.

---

## 2. User Journey

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. REGISTER │────▶│  2. DISCOVER  │────▶│   3. WAVE    │────▶│  4. CONNECT  │
│              │     │              │     │              │     │              │
│ - Name       │     │ - Browse     │     │ - Send wave  │     │ - Mutual     │
│ - Photo      │     │   matched    │     │ - See who    │     │   match!     │
│ - Role       │     │   profiles   │     │   waved at   │     │ - Exchange   │
│ - Tags       │     │ - Filter by  │     │   you        │     │   contact    │
│ - Looking for│     │   tag        │     │              │     │   info       │
│ - claude.md  │     │ - AI match   │     │              │     │              │
│ - Cool thing │     │   reasons    │     │              │     │              │
│              │     │              │     │              │     │              │
│ ──▶ Get your │     │              │     │              │     │              │
│ Claude Title!│     │              │     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                            ┌──────────────┐
                                                            │  5. BEACON   │
                                                            │              │
                                                            │ - Go live    │
                                                            │ - Matches    │
                                                            │   get notif  │
                                                            │ - "On my way"│
                                                            │ - QR scan    │
                                                            │   to connect │
                                                            └──────────────┘
```

### Detailed Steps

**Step 1 — Register (target: <2 minutes on mobile)**
1. User arrives at site → sees event branding + "Join Claude Connect" CTA
2. Sign up with email (magic link via Supabase Auth — no passwords)
3. Fill in profile:
   - **Name** (required) — text input
   - **Profile photo** (required) — `<input type="file" accept="image/*" capture="user">` for camera, with crop-to-square
   - **Role** (required) — free text, max 60 chars (e.g., "PM at Grab", "Indie Hacker", "ML Engineer")
   - **Tags** (required, pick 3-5) — multi-select from curated list (see below)
   - **Looking for** (required, pick 1-3) — multi-select from curated list (see below)
   - **claude.md snippet** (optional) — textarea, max 2000 chars
   - **Cool thing I've built** (optional) — textarea, max 280 chars
   - **MCP servers / skills I use** (optional) — free text, max 500 chars
   - **LinkedIn URL** (optional) — for contact exchange on mutual wave
   - **Email sharing** (optional) — toggle to share email on mutual wave
4. On submit → Claude API call generates their **Claude Title**
5. User sees their title with option to regenerate (max 3 times)
6. Profile saved → redirect to Discover feed

**Step 2 — Discover**
1. Default view: list of profile cards, sorted by match score (highest first)
2. Each card shows: photo, name, Claude Title, role, top 3 tags, match reason
3. Tap card → full profile view with conversation starter
4. Filter by tag (tap a tag to filter feed)
5. "Random Match" button at top — returns a serendipitous match outside user's usual bubble with a reason why it could be interesting

**Step 3 — Wave**
1. On any profile card or full profile, tap "👋 Wave" button
2. The other user gets a push notification (if enabled) or sees it in their Waves tab
3. Waves tab shows: "Waves I've Sent" and "Waves I've Received"

**Step 4 — Connect (Mutual Wave)**
1. When both users have waved at each other → "It's a match!" notification to both
2. Both users can now see each other's LinkedIn and/or email (based on their sharing preferences)
3. Connection appears in "My Connections" tab

**Step 5 — Beacon Mode**
1. User taps "Go Live" button → screen becomes full-screen Beacon card
2. Beacon shows: name, Claude Title, primary tag color, QR code
3. All matched users (score > 50) receive push notification: "🔥 [Name] — [Claude Title] — is live nearby"
4. Matched users see a "LIVE" badge on that person's card in Discover
5. Matched user can tap "On my way 🏃" → original user gets notification with their name + photo
6. They meet IRL → scan QR code → confirms connection and unlocks contact info
7. User taps "Go Dark" → Beacon off, live status removed

---

## 3. Data Model

### Supabase Tables

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT NOT NULL, -- max 60 chars
  claude_title TEXT, -- AI-generated fun title
  claude_title_regenerations INT DEFAULT 0, -- max 3
  tags TEXT[] NOT NULL DEFAULT '{}', -- from curated list
  looking_for TEXT[] NOT NULL DEFAULT '{}', -- from curated list
  claude_md_snippet TEXT, -- optional, max 2000 chars
  cool_thing TEXT, -- optional, max 280 chars
  mcp_servers_skills TEXT, -- optional, max 500 chars
  linkedin_url TEXT,
  share_email BOOLEAN DEFAULT false,
  is_beacon_active BOOLEAN DEFAULT false,
  beacon_activated_at TIMESTAMPTZ,
  primary_tag TEXT, -- first tag selected, used for Beacon color
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MATCHES TABLE (pre-computed by Claude API)
-- ============================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  match_reason TEXT NOT NULL, -- one-liner
  conversation_starter TEXT NOT NULL, -- specific question/topic
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

-- Ensure consistent ordering (user_a < user_b) via trigger
CREATE OR REPLACE FUNCTION ensure_match_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_a > NEW.user_b THEN
    -- Swap them
    DECLARE temp UUID;
    BEGIN
      temp := NEW.user_a;
      NEW.user_a := NEW.user_b;
      NEW.user_b := temp;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_order_trigger
BEFORE INSERT OR UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION ensure_match_order();

-- ============================================
-- WAVES TABLE
-- ============================================
CREATE TABLE public.waves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user, to_user)
);

-- ============================================
-- CONNECTIONS TABLE (created when mutual wave detected)
-- ============================================
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

-- ============================================
-- BEACON NOTIFICATIONS (for "On my way" tracking)
-- ============================================
CREATE TABLE public.beacon_pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- beacon owner
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user, to_user)
);

-- ============================================
-- PUSH SUBSCRIPTIONS (Web Push)
-- ============================================
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL, -- PushSubscription object
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_matches_user_a ON public.matches(user_a);
CREATE INDEX idx_matches_user_b ON public.matches(user_b);
CREATE INDEX idx_matches_score ON public.matches(score DESC);
CREATE INDEX idx_waves_from ON public.waves(from_user);
CREATE INDEX idx_waves_to ON public.waves(to_user);
CREATE INDEX idx_connections_users ON public.connections(user_a, user_b);
CREATE INDEX idx_profiles_beacon ON public.profiles(is_beacon_active) WHERE is_beacon_active = true;
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, own user can update
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Matches: users can see their own matches
CREATE POLICY "Users can see own matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Waves: users can see waves they sent or received
CREATE POLICY "Users can see own waves"
  ON public.waves FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can send waves"
  ON public.waves FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = from_user);

-- Connections: users can see own connections
CREATE POLICY "Users can see own connections"
  ON public.connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Beacon pings: users can see pings they sent or received
CREATE POLICY "Users can see own beacon pings"
  ON public.beacon_pings FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can send beacon pings"
  ON public.beacon_pings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = from_user);

-- Push subscriptions: users manage own
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated USING (auth.uid() = user_id);
```

### Supabase Storage

```
Bucket: avatars
  - Public bucket
  - File path: {user_id}/avatar.{ext}
  - Max file size: 2MB
  - Allowed MIME types: image/jpeg, image/png, image/webp
```

### Supabase Realtime

Subscribe to these channels:
- `profiles:is_beacon_active` — listen for beacon status changes
- `waves` — listen for new waves (filtered to current user)
- `connections` — listen for new mutual matches
- `beacon_pings` — listen for "on my way" pings

---

## 4. Feature Specifications

### 4.1 Curated Tag List

```typescript
export const INTEREST_TAGS = [
  "MCP Servers",
  "Multi-Agent Workflows",
  "Claude Code",
  "Prompt Engineering",
  "Web Development",
  "Mobile Development",
  "Data & Analytics",
  "DevOps & Infrastructure",
  "AI Products",
  "Open Source",
  "Startups & Indie Hacking",
  "Enterprise AI",
  "Design & UX",
  "Backend Systems",
  "Machine Learning",
  "Automation & Scripting",
  "Developer Tools",
  "Education & Teaching",
] as const;

export const LOOKING_FOR = [
  "Collaborators on a project",
  "Learning from experts",
  "Sharing what I've built",
  "Job opportunities",
  "Co-founders",
  "Just vibing & meeting people",
] as const;
```

### 4.2 Tag-to-Color Mapping (for Beacon Mode)

```typescript
export const TAG_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  "MCP Servers":              { bg: "#7C3AED", text: "#FFFFFF", glow: "#7C3AED" },  // Purple
  "Multi-Agent Workflows":    { bg: "#0891B2", text: "#FFFFFF", glow: "#0891B2" },  // Teal
  "Claude Code":              { bg: "#DC6B2F", text: "#FFFFFF", glow: "#DC6B2F" },  // Anthropic orange
  "Prompt Engineering":       { bg: "#059669", text: "#FFFFFF", glow: "#059669" },  // Emerald
  "Web Development":          { bg: "#2563EB", text: "#FFFFFF", glow: "#2563EB" },  // Blue
  "Mobile Development":       { bg: "#D946EF", text: "#FFFFFF", glow: "#D946EF" },  // Fuchsia
  "Data & Analytics":         { bg: "#0D9488", text: "#FFFFFF", glow: "#0D9488" },  // Teal-green
  "DevOps & Infrastructure":  { bg: "#475569", text: "#FFFFFF", glow: "#475569" },  // Slate
  "AI Products":              { bg: "#E11D48", text: "#FFFFFF", glow: "#E11D48" },  // Rose
  "Open Source":              { bg: "#16A34A", text: "#FFFFFF", glow: "#16A34A" },  // Green
  "Startups & Indie Hacking": { bg: "#F59E0B", text: "#000000", glow: "#F59E0B" },  // Amber
  "Enterprise AI":            { bg: "#1E3A5F", text: "#FFFFFF", glow: "#1E3A5F" },  // Navy
  "Design & UX":              { bg: "#EC4899", text: "#FFFFFF", glow: "#EC4899" },  // Pink
  "Backend Systems":          { bg: "#6366F1", text: "#FFFFFF", glow: "#6366F1" },  // Indigo
  "Machine Learning":         { bg: "#8B5CF6", text: "#FFFFFF", glow: "#8B5CF6" },  // Violet
  "Automation & Scripting":   { bg: "#78716C", text: "#FFFFFF", glow: "#78716C" },  // Stone
  "Developer Tools":          { bg: "#0EA5E9", text: "#FFFFFF", glow: "#0EA5E9" },  // Sky
  "Education & Teaching":     { bg: "#A3E635", text: "#000000", glow: "#A3E635" },  // Lime
};
```

### 4.3 Profile Photo Upload

```
Flow:
1. User taps "Take Photo" or "Upload Photo"
2. <input type="file" accept="image/*" capture="user"> triggers camera or file picker
3. Client-side: resize to 400x400px max, compress to <200KB JPEG
4. Upload to Supabase Storage: avatars/{user_id}/avatar.jpg
5. Save public URL to profiles.photo_url
6. Display as circle-cropped image everywhere

Libraries: browser-image-compression (npm) for client-side resize/compress
```

### 4.4 QR Code (for Beacon Mode)

```
Each user gets a QR code that encodes their profile URL:
  https://claudeconnect.vercel.app/profile/{user_id}

Generate client-side using `qrcode` npm package.
QR is displayed on the Beacon screen.
Scanning opens the profile → shows "Wave" button + conversation starter.
```

### 4.5 Beacon Mode Screen Layout

```
┌─────────────────────────────┐
│                             │
│  ┌───────────────────────┐  │
│  │   [Primary Tag Color  │  │
│  │    Full Background]   │  │
│  │                       │  │
│  │    ┌──────────┐       │  │
│  │    │  PHOTO   │       │  │
│  │    │ (large)  │       │  │
│  │    └──────────┘       │  │
│  │                       │  │
│  │   THE MCP WHISPERER   │  │  ← Claude Title (large, bold)
│  │                       │  │
│  │   Alex Chen           │  │  ← Real name
│  │   PM at Grab          │  │  ← Role
│  │                       │  │
│  │    ┌──────────┐       │  │
│  │    │ QR CODE  │       │  │
│  │    │          │       │  │
│  │    └──────────┘       │  │
│  │                       │  │
│  │   Scan to connect     │  │
│  │                       │  │
│  │  [ 🌙 Go Dark ]      │  │  ← Toggle off button
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘

- Full-screen, no browser chrome (uses Fullscreen API)
- Background color = primary tag color
- Subtle animated glow/pulse effect on the border
- Screen stays awake (Wake Lock API)
- QR code in white box for contrast
```

### 4.6 Leaderboard

Simple stats display on the main Discover page:
- Total attendees registered
- Total connections made
- Most popular tags (bar chart)
- "Most Connected" — top 5 users with most mutual connections (opt-in to appear)

---

## 5. API Routes

All API routes are Next.js Route Handlers (`app/api/...`).

### Authentication
```
POST /api/auth/magic-link     → Supabase magic link email
GET  /api/auth/callback        → Handle magic link redirect
POST /api/auth/session         → Get current session
```

### Profile
```
POST   /api/profile             → Create profile (after auth)
PUT    /api/profile             → Update profile
GET    /api/profile/[id]        → Get profile by ID (public)
POST   /api/profile/photo       → Upload photo to Supabase Storage
```

### Claude Title
```
POST /api/claude/generate-title → Generate Claude Title
  Input: { tags, role, looking_for, claude_md_snippet, cool_thing, mcp_servers_skills }
  Output: { claude_title: string }
  Rate limit: 3 per user (tracked in profiles.claude_title_regenerations)
```

### Matching
```
POST /api/matching/compute      → Trigger match computation for a user
  Called after profile creation/update
  Fans out Claude API calls to score against other users
  Writes to matches table

GET  /api/matching/discover     → Get matched profiles for current user
  Query: ?limit=20&offset=0&tag=<filter>
  Returns: profiles sorted by match score, with match_reason

GET  /api/matching/random       → Get a serendipitous random match
  Returns: a random profile with match score < 50 + a reason why it could work
```

### Waves
```
POST /api/waves                 → Send a wave
  Input: { to_user: UUID }
  Side effect: Check for mutual wave → create connection if mutual
  Side effect: Send push notification to recipient

GET  /api/waves/sent            → Waves I've sent
GET  /api/waves/received        → Waves I've received
GET  /api/waves/mutual          → My connections (mutual waves)
```

### Beacon
```
POST /api/beacon/activate       → Go live
  Side effect: Set is_beacon_active = true
  Side effect: Send push to top matches (score > 50)

POST /api/beacon/deactivate     → Go dark
  Side effect: Set is_beacon_active = false

POST /api/beacon/on-my-way      → Signal to beacon user
  Input: { to_user: UUID }
  Side effect: Push notification to beacon user

GET  /api/beacon/live            → Get all currently live users (that match me)
```

### Stats
```
GET /api/stats                  → Leaderboard data
  Returns: total users, total connections, popular tags, top connectors
```

---

## 6. Claude AI Integration

### 6.1 Claude Title Generation

**Endpoint:** `POST /api/claude/generate-title`

**Prompt Strategy:**
```typescript
const systemPrompt = `You are a creative title generator for a Claude Code meetup networking app.
Based on the attendee's profile, generate a fun, memorable 2-5 word title that captures their vibe.
The title should be witty, tech-relevant, and conversation-starting.

Rules:
- 2-5 words max
- Use "The" prefix sometimes but not always
- Reference their specific skills/interests, not generic tech terms
- Be playful — these are conversation starters at a meetup
- Never use offensive or exclusionary language
- Format: Return ONLY the title text, nothing else

Examples of good titles:
- "The MCP Whisperer"
- "Agent Herder"
- "Prompt Poet Laureate"
- "Vibe Coder Supreme"
- "Full Stack Centaur"
- "The Context Window Surfer"
- "Multi-Agent Maestro"
- "Terminal Velocity"
- "The Diff Whisperer"
- "Chaos Prompt Engineer"`;

const userPrompt = `Generate a Claude Title for this attendee:
Role: ${role}
Interests: ${tags.join(", ")}
Looking for: ${lookingFor.join(", ")}
${claudeMd ? `claude.md snippet: ${claudeMd}` : ""}
${coolThing ? `Cool thing they built: ${coolThing}` : ""}
${mcpSkills ? `MCP servers/skills: ${mcpSkills}` : ""}`;
```

**Model:** `claude-sonnet-4-20250514` (fast, cheap, creative enough)
**Max tokens:** 30

### 6.2 Match Computation

**Strategy:** We don't compute all N×N pairs (800 users = 319,600 pairs). Instead:

1. **On registration**, compute matches against existing users using a two-phase approach:
   - **Phase 1 — Pre-filter:** Use tag overlap + looking_for compatibility to narrow candidates to ~100 per user (pure SQL, no API cost)
   - **Phase 2 — Claude scoring:** Send batches of 10 candidate pairs to Claude for scoring

2. **Background job** (Vercel Cron or triggered manually): recompute matches periodically as new users join

**Pre-filter SQL:**
```sql
-- Find candidates with tag overlap for a given user
SELECT p.id, p.tags, p.looking_for, p.role, p.claude_md_snippet,
       p.cool_thing, p.mcp_servers_skills, p.claude_title,
       ARRAY_LENGTH(ARRAY(SELECT UNNEST(p.tags) INTERSECT SELECT UNNEST($1::text[])), 1) as tag_overlap
FROM profiles p
WHERE p.id != $2
  AND ARRAY_LENGTH(ARRAY(SELECT UNNEST(p.tags) INTERSECT SELECT UNNEST($1::text[])), 1) > 0
ORDER BY tag_overlap DESC
LIMIT 100;
```

**Claude Batch Scoring Prompt:**
```typescript
const systemPrompt = `You are a networking match scorer for a Claude Code meetup.
Given two attendee profiles, score their match quality from 0-100 and explain why.

Scoring criteria:
- Complementary skills (30%): One has what the other wants
- Shared interests (25%): Overlapping tags and tools
- Goal alignment (25%): Compatible "looking for" intentions
- Serendipity bonus (20%): Unexpected but interesting connections

Return JSON format:
{
  "score": <number 0-100>,
  "reason": "<one sentence, max 100 chars, why they should meet>",
  "conversation_starter": "<specific question or topic to discuss, max 150 chars>"
}`;

const userPrompt = `Score the match between these two attendees:

PERSON A:
Name: ${a.name}
Role: ${a.role}
Tags: ${a.tags.join(", ")}
Looking for: ${a.looking_for.join(", ")}
${a.claude_md_snippet ? `claude.md: ${a.claude_md_snippet.substring(0, 500)}` : ""}
${a.cool_thing ? `Built: ${a.cool_thing}` : ""}
${a.mcp_servers_skills ? `MCP/Skills: ${a.mcp_servers_skills}` : ""}

PERSON B:
Name: ${b.name}
Role: ${b.role}
Tags: ${b.tags.join(", ")}
Looking for: ${b.looking_for.join(", ")}
${b.claude_md_snippet ? `claude.md: ${b.claude_md_snippet.substring(0, 500)}` : ""}
${b.cool_thing ? `Built: ${b.cool_thing}` : ""}
${b.mcp_servers_skills ? `MCP/Skills: ${b.mcp_servers_skills}` : ""}`;
```

**Model:** `claude-sonnet-4-20250514`
**Max tokens:** 200
**Batch size:** Send 10 pairs per request (pack into a single prompt asking for 10 JSON objects)

**Cost estimate:**
- ~100 candidates per user × 800 users = 80,000 scoring calls
- Batched 10 at a time = 8,000 API calls
- ~500 input tokens + 2,000 output tokens per batch call
- Roughly $4-8 total at Sonnet pricing. Very affordable.

### 6.3 API Key Management

Store Anthropic API key as a Vercel environment variable: `ANTHROPIC_API_KEY`
All Claude calls happen server-side in API routes. Never expose the key to the client.

---

## 7. Real-time & Push Notifications

### 7.1 Supabase Realtime (in-app, when PWA is open)

```typescript
// Client-side subscription for waves
const channel = supabase
  .channel('waves')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'waves',
    filter: `to_user=eq.${currentUserId}`
  }, (payload) => {
    showInAppNotification(`${payload.new.from_user} waved at you!`);
  })
  .subscribe();

// Listen for beacon activations of my matches
const beaconChannel = supabase
  .channel('beacons')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `is_beacon_active=eq.true`
  }, (payload) => {
    // Check if this user is in my matches
    checkIfMatchAndNotify(payload.new.id);
  })
  .subscribe();
```

### 7.2 Web Push Notifications (background, when PWA is closed or backgrounded)

**Setup:**
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Store in Vercel env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
3. Service worker handles push events

**Registration flow:**
```typescript
// After user profile creation, prompt for push permission
const registration = await navigator.serviceWorker.register('/sw.js');
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
});
// Save subscription to push_subscriptions table
await supabase.from('push_subscriptions').insert({
  user_id: currentUserId,
  subscription: subscription.toJSON()
});
```

**Service Worker (`public/sw.js`):**
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url },
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

**Server-side push (in API routes):**
```typescript
import webPush from 'web-push';

webPush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

async function sendPushToUser(userId: string, title: string, body: string, url: string) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  for (const sub of subs || []) {
    try {
      await webPush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, body, url })
      );
    } catch (err) {
      // Remove invalid subscriptions
      if ((err as any).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
      }
    }
  }
}
```

**Notification triggers:**
| Event | Who gets notified | Message |
|-------|-------------------|---------|
| New wave received | Wave recipient | "👋 [Name] — [Claude Title] waved at you!" |
| Mutual wave (connection!) | Both users | "🎉 It's a match! You and [Name] are connected" |
| Beacon activated | Top 20 matched users (score > 50) | "🔥 [Name] — [Claude Title] is live nearby" |
| "On my way" ping | Beacon owner | "🏃 [Name] is heading your way!" |

### 7.3 iOS PWA Notification Handling

**Critical:** Push notifications on iOS only work if the PWA is added to the home screen. The app must:
1. Detect if running as standalone PWA or in Safari
2. If in Safari, show a prominent "Add to Home Screen" tutorial overlay
3. Only request push permission after home screen installation is confirmed

```typescript
// Detect PWA mode
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as any).standalone === true;

// Show add-to-home-screen prompt if in browser
if (!isStandalone) {
  showAddToHomeScreenOverlay();
}
```

---

## 8. Design System

### 8.1 Aesthetic Direction

**Concept:** "Terminal Glow" — dark theme inspired by terminal aesthetics but elevated with modern gradients, warm glows, and smooth animations. On-brand for a Claude Code meetup. The dark background makes Beacon Mode colors pop.

**Core Palette:**
```css
:root {
  /* Background */
  --bg-primary: #0A0A0F;        /* Near-black with blue tint */
  --bg-secondary: #12121A;       /* Card backgrounds */
  --bg-elevated: #1A1A25;        /* Elevated surfaces */

  /* Text */
  --text-primary: #F0EDE6;       /* Warm white */
  --text-secondary: #8E8B82;     /* Muted warm gray */
  --text-accent: #DC6B2F;        /* Anthropic orange */

  /* Accent */
  --accent-primary: #DC6B2F;     /* Anthropic orange — CTAs, highlights */
  --accent-secondary: #7C3AED;   /* Purple — secondary actions */
  --accent-success: #10B981;     /* Green — connections, success states */

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(255, 255, 255, 0.12);

  /* Effects */
  --glow-orange: 0 0 20px rgba(220, 107, 47, 0.3);
  --glow-purple: 0 0 20px rgba(124, 58, 237, 0.3);
}
```

**Typography:**
```css
/* Display / Claude Titles — distinctive, techy */
font-family: 'JetBrains Mono', monospace;

/* Body / UI text — clean, readable */
font-family: 'DM Sans', sans-serif;
```

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 8.2 Component Patterns

**Profile Card:**
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │PHOTO │  The MCP Whisperer    │  ← Claude Title (JetBrains Mono, bold)
│  │      │  Alex Chen            │  ← Name (DM Sans)
│  └──────┘  PM at Grab           │  ← Role (muted)
│                                 │
│  [MCP Servers] [Claude Code]    │  ← Tag pills (colored per tag)
│                                 │
│  "You both use multi-agent      │  ← Match reason (italic, accent)
│   workflows and want to collab" │
│                                 │
│         [ 👋 Wave ]             │  ← CTA button
└─────────────────────────────────┘

- bg: var(--bg-secondary)
- border: 1px solid var(--border-subtle)
- border-radius: 16px
- hover: border-color transitions to tag color
- subtle entrance animation (fade up + slide)
```

**Tag Pills:**
```
- bg: tag color at 15% opacity
- text: tag color at 100%
- border-radius: 999px
- padding: 4px 12px
- font-size: 12px, DM Sans 500
```

**Wave Button:**
```
- bg: var(--accent-primary)
- text: white
- border-radius: 12px
- hover: scale(1.02) + glow effect
- active: scale(0.98)
- after wave sent: changes to "✓ Waved" (muted state)
```

### 8.3 Animations

```css
/* Card entrance — staggered fade-up */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.card { animation: fadeUp 0.4s ease-out forwards; }
.card:nth-child(n) { animation-delay: calc(n * 0.05s); }

/* Beacon glow pulse */
@keyframes beaconPulse {
  0%, 100% { box-shadow: 0 0 20px var(--tag-glow); }
  50% { box-shadow: 0 0 60px var(--tag-glow), 0 0 100px var(--tag-glow); }
}
.beacon-active { animation: beaconPulse 2s ease-in-out infinite; }

/* Live badge pulse */
@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.live-badge { animation: livePulse 1.5s ease-in-out infinite; }

/* Wave button success */
@keyframes waveSuccess {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

### 8.4 Mobile-First Layout

```
- Max content width: 480px (centered on larger screens)
- Bottom navigation bar with 4 tabs: Discover | Waves | Connections | Profile
- Pull-to-refresh on Discover feed
- Haptic feedback on wave sent (navigator.vibrate)
- Safe area padding for notched phones
```

---

## 9. PWA Configuration

### next.config.js PWA setup

Use `next-pwa` or `@serwist/next` for service worker generation.

### Manifest (`public/manifest.json`)
```json
{
  "name": "Claude Connect",
  "short_name": "Connect",
  "description": "Network with Claude Code meetup attendees",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0F",
  "theme_color": "#DC6B2F",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Add-to-Home-Screen Overlay

Show a custom overlay for iOS Safari users with step-by-step:
1. Tap the Share button ↑
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add"

Include a "Skip for now" option but make it prominent — push notifications depend on this.

### Wake Lock (for Beacon Mode)

```typescript
let wakeLock: WakeSentinel | null = null;

async function enableWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    console.log('Wake Lock not supported');
  }
}

async function disableWakeLock() {
  await wakeLock?.release();
  wakeLock = null;
}
```

---

## 10. Build Plan (3-Day Sprint)

### Day 1: Foundation + Registration + Claude Title

**Morning (4 hrs):**
- [ ] Initialize Next.js 14 project with TypeScript + Tailwind
- [ ] Set up Supabase project (database, auth, storage, realtime)
- [ ] Run all SQL migrations (tables, RLS policies, indexes)
- [ ] Configure Supabase Auth with magic link
- [ ] Set up Vercel project + environment variables
- [ ] Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `browser-image-compression`, `qrcode`, `web-push`

**Afternoon (4 hrs):**
- [ ] Build registration flow:
  - Landing page with event branding
  - Magic link auth (email input → check email → redirect back)
  - Profile creation form (all fields from spec)
  - Photo upload with client-side compression
  - Tag & looking-for multi-select components
- [ ] Build Claude Title API route
- [ ] Title reveal screen with regenerate button
- [ ] Deploy to Vercel — test full registration flow on mobile

**Evening (2 hrs):**
- [ ] Polish registration UX
- [ ] Add form validation
- [ ] Test photo upload on iOS + Android
- [ ] Ensure magic link works reliably

### Day 2: Matching + Discover + Waves

**Morning (4 hrs):**
- [ ] Build match computation API:
  - Pre-filter candidates by tag overlap (SQL)
  - Batch Claude scoring (10 pairs per API call)
  - Write results to matches table
  - Trigger on profile creation
- [ ] Build Discover feed:
  - Fetch matches sorted by score
  - Profile card component (photo, title, role, tags, match reason)
  - Tag filter bar
  - "Random Match" button
  - Infinite scroll / pagination

**Afternoon (4 hrs):**
- [ ] Full profile view page:
  - All profile details
  - Conversation starter prominently displayed
  - Wave button
  - QR code display
- [ ] Wave system:
  - Send wave API route (with mutual detection)
  - Waves tab (sent / received / mutual)
  - In-app notification via Supabase Realtime
  - "It's a match!" celebration screen on mutual wave
- [ ] Connection list with contact info exchange

**Evening (2 hrs):**
- [ ] Set up Supabase Realtime subscriptions
- [ ] Add bottom navigation bar
- [ ] Test wave flow end-to-end with two devices/browsers
- [ ] Deploy and test

### Day 3: Beacon + Push + Polish

**Morning (4 hrs):**
- [ ] Beacon Mode:
  - Full-screen beacon card (tag color, photo, title, QR)
  - Fullscreen API integration
  - Wake Lock API integration
  - Beacon glow animation
  - Go Live / Go Dark toggle
- [ ] Push notifications:
  - Generate VAPID keys
  - Service worker for push events
  - Push subscription management
  - Server-side push sending for: waves, mutual matches, beacon activations, on-my-way pings
- [ ] "On my way" ping flow

**Afternoon (4 hrs):**
- [ ] Add-to-Home-Screen overlay (iOS tutorial)
- [ ] Leaderboard / stats section
- [ ] PWA manifest + icons
- [ ] Seed database with 50 test profiles for demo/testing
- [ ] Load test: simulate 200+ concurrent users on Discover feed
- [ ] Performance optimization:
  - Image lazy loading
  - Match query optimization
  - Realtime subscription cleanup

**Evening (2 hrs):**
- [ ] Final mobile testing (iOS Safari, Android Chrome)
- [ ] Fix edge cases
- [ ] Final deploy
- [ ] Write a short "How to use Claude Connect" guide for the event

---

## 11. Deployment & Infrastructure

### Vercel Configuration
```
Framework: Next.js
Build command: next build
Output directory: .next
Node.js version: 20.x

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  (server-side only)
  ANTHROPIC_API_KEY=<api-key>
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public>
  VAPID_PRIVATE_KEY=<vapid-private>
  NEXT_PUBLIC_APP_URL=https://claudeconnect.vercel.app
```

### Supabase Configuration
```
Database: PostgreSQL (default)
Auth: Email magic link enabled
Storage: avatars bucket (public, 2MB limit)
Realtime: Enabled for profiles, waves, connections, beacon_pings tables
Edge Functions: Not needed (using Next.js API routes)
```

### Performance Targets
- Registration flow: < 3s total load
- Discover feed: < 1s initial load, < 500ms subsequent pages
- Wave action: < 300ms response
- Beacon activation: < 500ms + push within 2s
- Support 800 concurrent users

---

## 12. File Structure

```
claude-connect/
├── public/
│   ├── manifest.json
│   ├── sw.js                    # Service worker for push notifications
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── badge-72.png
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout, fonts, meta
│   │   ├── page.tsx             # Landing page
│   │   ├── globals.css          # Tailwind + custom CSS variables
│   │   ├── auth/
│   │   │   ├── login/page.tsx   # Magic link input
│   │   │   └── callback/route.ts # Auth callback handler
│   │   ├── onboarding/
│   │   │   ├── page.tsx         # Profile creation form
│   │   │   └── title/page.tsx   # Claude Title reveal + regenerate
│   │   ├── discover/
│   │   │   └── page.tsx         # Main Discover feed
│   │   ├── profile/
│   │   │   ├── page.tsx         # My profile
│   │   │   └── [id]/page.tsx    # View other user's profile
│   │   ├── waves/
│   │   │   └── page.tsx         # Waves sent/received/connections
│   │   ├── connections/
│   │   │   └── page.tsx         # My connections with contact info
│   │   ├── beacon/
│   │   │   └── page.tsx         # Beacon Mode full screen
│   │   ├── stats/
│   │   │   └── page.tsx         # Leaderboard
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/route.ts
│   │       ├── profile/
│   │       │   ├── route.ts     # CRUD profile
│   │       │   ├── photo/route.ts # Photo upload
│   │       │   └── [id]/route.ts
│   │       ├── claude/
│   │       │   └── generate-title/route.ts
│   │       ├── matching/
│   │       │   ├── compute/route.ts
│   │       │   ├── discover/route.ts
│   │       │   └── random/route.ts
│   │       ├── waves/
│   │       │   └── route.ts
│   │       ├── beacon/
│   │       │   ├── activate/route.ts
│   │       │   ├── deactivate/route.ts
│   │       │   ├── on-my-way/route.ts
│   │       │   └── live/route.ts
│   │       ├── push/
│   │       │   ├── subscribe/route.ts
│   │       │   └── send/route.ts
│   │       └── stats/route.ts
│   ├── components/
│   │   ├── ui/                  # Shared UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── TagPill.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── BottomNav.tsx
│   │   ├── ProfileCard.tsx      # Card in Discover feed
│   │   ├── ProfileForm.tsx      # Registration form
│   │   ├── TitleReveal.tsx      # Claude Title animation
│   │   ├── BeaconScreen.tsx     # Full-screen beacon
│   │   ├── QRCode.tsx           # QR code generator
│   │   ├── WaveButton.tsx       # Wave CTA with states
│   │   ├── MatchCelebration.tsx # "It's a match!" overlay
│   │   ├── AddToHomeScreen.tsx  # iOS/Android install prompt
│   │   ├── NotificationToast.tsx # In-app notifications
│   │   └── StatsBar.tsx         # Leaderboard display
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client
│   │   │   ├── server.ts        # Server Supabase client
│   │   │   └── middleware.ts    # Auth middleware
│   │   ├── claude.ts            # Anthropic API wrapper
│   │   ├── matching.ts          # Match computation logic
│   │   ├── push.ts              # Web push utilities
│   │   ├── image.ts             # Photo compression utilities
│   │   └── constants.ts         # Tags, colors, looking_for lists
│   ├── hooks/
│   │   ├── useProfile.ts        # Current user profile
│   │   ├── useMatches.ts        # Matched profiles
│   │   ├── useWaves.ts          # Wave management
│   │   ├── useBeacon.ts         # Beacon state + wake lock
│   │   ├── useRealtime.ts       # Supabase Realtime subscriptions
│   │   └── usePushNotifications.ts
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 13. Edge Cases & Constraints

### Authentication
- Magic link emails can be slow — show a "Check your email" screen with a resend option after 30s
- Handle expired magic links gracefully (redirect to login with message)
- Session persistence: use Supabase's `@supabase/ssr` for cookie-based sessions

### Matching
- First user to register has no one to match with — show "You're one of the first! Matches will appear as more people join"
- If Claude API is rate-limited or down, fall back to tag-overlap-only scoring (no AI reason/starter)
- Cap matches stored per user at 50 to keep the database manageable
- Deduplicate: ensure (user_a, user_b) is always ordered so we don't store both directions

### Beacon Mode
- If multiple matches go live simultaneously, batch notifications (don't spam)
- Auto-deactivate beacon after 30 minutes (prevent forgotten beacons draining battery)
- Handle Fullscreen API permission denial gracefully — beacon still works, just not immersive

### Push Notifications
- Not all users will grant push permission — always show in-app notifications as fallback
- iOS Safari push requires Add to Home Screen — track which users are in standalone mode
- Clean up stale push subscriptions on 410 errors

### Performance at 800 Users
- Discover feed: paginate at 20 profiles per page, lazy-load images
- Match computation: batch and queue, don't block registration
- Realtime: scope subscriptions to current user's matches only (don't listen to all 800)
- Photo storage: compress to <200KB client-side before upload

### Privacy
- Users can delete their profile at any time (cascades to all related data)
- Email is only shared on mutual wave if user opted in
- claude.md content is only used for matching, never displayed to other users publicly
- No location tracking — beacon is purely a status flag, not GPS

---

## Quick Start for Claude Code

```bash
# 1. Create the project
npx create-next-app@latest claude-connect --typescript --tailwind --app --src-dir

# 2. Install dependencies
cd claude-connect
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk browser-image-compression qrcode web-push
npm install -D @types/qrcode @types/web-push

# 3. Set up environment
cp .env.example .env.local
# Fill in Supabase and Anthropic credentials

# 4. Run Supabase migrations
# Copy SQL from section 3 into Supabase SQL editor or use supabase CLI

# 5. Start development
npm run dev
```

**Priority order for building:**
1. Auth + Profile creation (must work perfectly)
2. Claude Title generation (the "wow" moment)
3. Discover feed with match cards (core value)
4. Wave + Connection system (the networking loop)
5. Beacon Mode (the in-person magic)
6. Push notifications (enhancement)
7. Leaderboard / stats (nice to have)

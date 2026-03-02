# Claude Connect

A networking PWA that helps meetup attendees discover, match with, and connect with like-minded people at events. Built with Claude Code for the Claude Code Meetup Singapore.

**Live:** [claude-code-meetup.vercel.app](https://claude-code-meetup.vercel.app)

## Features

- **AI-Powered Matching** — Claude scores attendee compatibility based on interests, roles, and project descriptions
- **Claude Titles** — Each attendee gets a unique AI-generated title on their profile
- **Discover Feed** — Browse attendees ranked by match score with conversation starters
- **Waves & Connections** — Send interest signals; mutual waves become connections with shared contact info
- **Beacon Mode** — Full-screen colored card to help people find you at the event
- **Name Search** — Opt-in discoverability so people can find you by name
- **Magic Link Auth** — Frictionless sign-in via email, Google, or GitHub

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (Postgres + Auth + Storage + Realtime) |
| AI | Anthropic Claude API (match scoring + title generation) |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)

### Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/anthropics/claude-code-meetup-app.git
   cd claude-code-meetup-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your keys:
   | Variable | Description |
   |----------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key |
   | `NEXT_PUBLIC_APP_URL` | Your app URL (`http://localhost:3000` for local dev) |

4. **Set up the database:**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/`
   - See `ARCHITECTURE.md` for the full data model (tables: `profiles`, `matches`, `waves`, `connections`, `beacon_pings`)

5. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/              # Next.js App Router pages
    api/            # API routes (matching, waves, profiles, etc.)
    auth/           # Auth callback + login
    beacon/         # Beacon mode
    connections/    # Mutual connections view
    discover/       # Discovery feed
    onboarding/     # Profile setup + Claude title reveal
    privacy/        # Privacy policy
    profile/        # Profile view/edit
    terms/          # Terms of service
    waves/          # Waves (interest signals) view
  components/       # Shared UI components
  lib/              # Utilities (Supabase clients, Claude helpers, etc.)
scripts/            # Dev utilities
supabase/           # Database migrations
ARCHITECTURE.md     # Full design spec and architecture decisions
```

## Fork It for Your Own Meetup

This project is designed to be forked and adapted for other events. Here's a quick guide:

1. Fork the repo
2. Update the branding — colors and theme are defined in `src/app/globals.css` under `@theme inline`
3. Set up your own Supabase project and Anthropic API key
4. Update the privacy policy and terms of service pages with your own event details
5. Deploy to Vercel with `vercel deploy`

See `CONTRIBUTING.md` for more details.

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design spec covering data model, AI integration, feature specifications, and design system.

## License

[MIT](./LICENSE)

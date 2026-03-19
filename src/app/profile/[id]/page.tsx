"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_SEASONS, HOPING_FOR } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";

interface FullProfile {
  id: string;
  name: string;
  work_one_liner: string | null;
  current_season: string | null;
  discussion_topics: string[];
  hoping_for: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  linkedin_public: boolean;
  share_email: boolean;
}

interface MatchData {
  score: number;
  match_reason: string;
  conversation_starter: string;
}

function Avatar({ name, photo_url, size = 80 }: {
  name: string;
  photo_url: string | null;
  size?: number;
}) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (photo_url) {
    return (
      <img
        src={photo_url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-bold"
      style={{
        width: size,
        height: size,
        background: "var(--bg-elevated)",
        color: "var(--text-secondary)",
        border: "2px solid var(--border-subtle)",
        fontSize: size * 0.3,
      }}
    >
      {initials}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return "var(--accent-success)";
  if (score >= 50) return "var(--accent-primary)";
  return "var(--text-secondary)";
}

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [waved, setWaved] = useState(false);
  const [waving, setWaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMutualConnection, setIsMutualConnection] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setCurrentUserId(user.id);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name, work_one_liner, current_season, discussion_topics, hoping_for, photo_url, linkedin_url, linkedin_public, share_email")
        .eq("id", profileId)
        .maybeSingle();

      if (!profileData) { router.push("/discover"); return; }
      setProfile(profileData as FullProfile);

      // Fetch match between viewer and this profile
      const [a, b] = [user.id, profileId].sort();
      const { data: matchData } = await supabase
        .from("matches")
        .select("score, match_reason, conversation_starter")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();

      if (matchData) setMatch(matchData as MatchData);

      // Check if already waved
      const { data: waveData } = await supabase
        .from("waves")
        .select("id")
        .eq("from_user", user.id)
        .eq("to_user", profileId)
        .maybeSingle();

      if (waveData) setWaved(true);

      // Check if mutual connection (to determine LinkedIn visibility)
      const { data: connData } = await supabase
        .from("connections")
        .select("id")
        .or(
          `and(user_a.eq.${user.id},user_b.eq.${profileId}),and(user_a.eq.${profileId},user_b.eq.${user.id})`
        )
        .maybeSingle();

      if (connData) setIsMutualConnection(true);

      setLoading(false);
    }

    load();
  }, [profileId, router]);

  const handleWave = async () => {
    if (waved || waving) return;
    setWaving(true);
    setWaved(true);
    try {
      await fetch("/api/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user: profileId }),
      });
    } finally {
      setWaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = currentUserId === profileId;
  const season = CURRENT_SEASONS.find((s) => s.value === profile.current_season);
  const hoping = HOPING_FOR.find((h) => h.value === profile.hoping_for);
  const showLinkedIn = profile.linkedin_url && (profile.linkedin_public || isMutualConnection);

  return (
    <div className="min-h-dvh pb-28">
      {/* Back */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: "var(--bg-primary)" }}>
        <Link href="/discover" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          ← Back
        </Link>
      </div>

      <div className="px-4 space-y-4">
        {/* Hero */}
        <div
          className="rounded-2xl p-5 flex flex-col items-center text-center gap-3"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <Avatar name={profile.name} photo_url={profile.photo_url} size={80} />

          <div>
            <h1 className="font-semibold text-lg">{profile.name}</h1>
            {profile.work_one_liner && (
              <p className="text-text-secondary text-sm mt-1">{profile.work_one_liner}</p>
            )}
          </div>

          {/* Match score */}
          {match && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold" style={{ color: scoreColor(match.score) }}>
                {match.score}
              </span>
              <span className="text-text-secondary text-xs">match score</span>
            </div>
          )}
        </div>

        {/* Season */}
        {season && (
          <div
            className="rounded-2xl p-4 flex flex-wrap gap-2"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              {season.emoji} {season.label}
            </span>
          </div>
        )}

        {/* Looking for */}
        {hoping && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>
              LOOKING FOR
            </p>
            <div className="flex flex-wrap gap-2">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                {hoping.label}
              </span>
            </div>
          </div>
        )}

        {/* Discussion topics */}
        {profile.discussion_topics.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>
              WANTS TO DISCUSS
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.discussion_topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Match reason + conversation starter */}
        {match && (
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--accent-primary)40" }}
          >
            <p className="font-mono text-xs font-bold" style={{ color: "var(--accent-primary)" }}>
              WHY YOU MATCH
            </p>
            <p className="text-sm leading-relaxed text-text-secondary italic">
              &ldquo;{match.match_reason}&rdquo;
            </p>
            {match.conversation_starter && (
              <>
                <p className="font-mono text-xs font-bold pt-1" style={{ color: "var(--accent-secondary)" }}>
                  CONVERSATION STARTER
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {match.conversation_starter}
                </p>
              </>
            )}
          </div>
        )}

        {/* LinkedIn (public, or revealed on mutual connection) */}
        {showLinkedIn && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>
              CONNECT
            </p>
            <a
              href={profile.linkedin_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--accent-primary)" }}
            >
              LinkedIn →
            </a>
          </div>
        )}

        {/* LinkedIn private hint (waved but not mutual yet) */}
        {!showLinkedIn && profile.linkedin_url && !isMutualConnection && !isOwnProfile && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="font-mono text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
              CONNECT
            </p>
            <p className="text-xs text-text-secondary">
              Wave back and forth to unlock their LinkedIn.
            </p>
          </div>
        )}

        {/* Wave button */}
        {!isOwnProfile && (
          <button
            onClick={handleWave}
            disabled={waved || waving}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: waved ? "var(--bg-elevated)" : "var(--accent-primary)",
              color: waved ? "var(--text-secondary)" : "white",
              opacity: waved ? 0.7 : 1,
            }}
          >
            {waved ? "✓ Waved" : "👋 Wave"}
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

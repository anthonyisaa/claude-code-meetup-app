"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TAG_COLORS } from "@/lib/constants";
import { TOTEMS } from "@/lib/totems";
import BottomNav from "@/components/BottomNav";
import MiniTotem from "@/components/MiniTotem";
import PixelTotem from "@/components/PixelTotem";

interface FullProfile {
  id: string;
  name: string;
  role: string;
  claude_title: string | null;
  tags: string[];
  looking_for: string[];
  photo_url: string | null;
  primary_tag: string | null;
  is_beacon_active: boolean;
  beacon_totem: string | null;
  beacon_color: string | null;
  beacon_bg: string | null;
  share_email: boolean;
  linkedin_url: string | null;
}

interface MatchData {
  score: number;
  match_reason: string;
  conversation_starter: string;
}

function Avatar({ name, photo_url, primary_tag, size = 80 }: {
  name: string;
  photo_url: string | null;
  primary_tag: string | null;
  size?: number;
}) {
  const color = primary_tag ? TAG_COLORS[primary_tag] : null;
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
        background: color ? `${color.bg}30` : "var(--bg-elevated)",
        color: color ? color.bg : "var(--text-secondary)",
        border: `2px solid ${color ? color.bg : "var(--border-subtle)"}`,
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
  const [pinged, setPinged] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setCurrentUserId(user.id);

      // Fetch the profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name, role, claude_title, tags, looking_for, photo_url, primary_tag, is_beacon_active, beacon_totem, beacon_color, beacon_bg, share_email, linkedin_url")
        .eq("id", profileId)
        .single();

      if (!profileData) { router.push("/discover"); return; }
      setProfile(profileData as FullProfile);

      // Fetch match between viewer and this profile
      const [a, b] = [user.id, profileId].sort();
      const { data: matchData } = await supabase
        .from("matches")
        .select("score, match_reason, conversation_starter")
        .eq("user_a", a)
        .eq("user_b", b)
        .single();

      if (matchData) setMatch(matchData as MatchData);

      // Check if already waved
      const { data: waveData } = await supabase
        .from("waves")
        .select("id")
        .eq("from_user", user.id)
        .eq("to_user", profileId)
        .maybeSingle();

      if (waveData) setWaved(true);

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

  const handlePing = async () => {
    if (pinged) return;
    setPinged(true);
    try {
      await fetch("/api/beacon/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user: profileId }),
      });
    } catch {
      // Keep optimistic state
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

  const primaryColor = profile.primary_tag ? TAG_COLORS[profile.primary_tag] : null;
  const isOwnProfile = currentUserId === profileId;

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
          <div className="relative">
            <Avatar name={profile.name} photo_url={profile.photo_url} primary_tag={profile.primary_tag} size={80} />
            {profile.is_beacon_active && (
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 animate-live-pulse"
                style={{
                  background: primaryColor?.bg ?? "var(--accent-success)",
                  borderColor: "var(--bg-secondary)",
                }}
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-semibold text-lg">{profile.name}</h1>
              {profile.is_beacon_active && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded animate-live-pulse"
                  style={{ background: `${primaryColor?.bg ?? "var(--accent-success)"}20`, color: primaryColor?.bg ?? "var(--accent-success)" }}
                >
                  <MiniTotem
                    totemId={profile.beacon_totem || TOTEMS[0].id}
                    color={profile.beacon_color || primaryColor?.bg || "var(--accent-success)"}
                    size={14}
                  />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-text-secondary text-sm">{profile.role}</p>
            {profile.claude_title && (
              <p className="font-mono text-sm mt-1" style={{ color: "var(--accent-primary)" }}>
                {profile.claude_title}
              </p>
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

        {/* Beacon totem — "Look for this" card */}
        {profile.is_beacon_active && (() => {
          const totem = TOTEMS.find((t) => t.id === profile.beacon_totem) || TOTEMS[0];
          const bColor = profile.beacon_color || primaryColor?.bg || "#DC6B2F";
          const bBg = profile.beacon_bg || "#0A0A0F";
          return (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${bColor}30` }}
            >
              <div className="flex flex-col items-center py-6" style={{ background: bBg }}>
                <div
                  className="animate-beacon-pulse rounded-2xl p-4"
                  style={{ "--tag-glow": bColor } as React.CSSProperties}
                >
                  <PixelTotem totem={totem} color={bColor} bgColor={bBg} size={120} />
                </div>
              </div>
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: "var(--bg-secondary)" }}
              >
                <div>
                  <p className="font-mono text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
                    LOOK FOR THIS
                  </p>
                  <p className="text-xs" style={{ color: bColor }}>
                    {totem.name} totem
                  </p>
                </div>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-1 rounded-full animate-live-pulse"
                  style={{ background: `${bColor}20`, color: bColor }}
                >
                  LIVE NOW
                </span>
              </div>
            </div>
          );
        })()}

        {/* Tags */}
        {profile.tags.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>INTERESTS</p>
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag) => {
                const c = TAG_COLORS[tag];
                return (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{
                      background: c ? `${c.bg}20` : "var(--bg-elevated)",
                      color: c ? c.bg : "var(--text-secondary)",
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Looking for */}
        {profile.looking_for?.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>LOOKING FOR</p>
            <div className="flex flex-wrap gap-2">
              {profile.looking_for.map((item) => (
                <span
                  key={item}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Match reason + conversation starter */}
        {match && (
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "var(--bg-secondary)", border: `1px solid ${primaryColor?.bg ?? "var(--accent-primary)"}40` }}
          >
            <p className="font-mono text-xs font-bold" style={{ color: "var(--accent-primary)" }}>WHY YOU MATCH</p>
            <p className="text-sm leading-relaxed text-text-secondary italic">
              &ldquo;{match.match_reason}&rdquo;
            </p>
            {match.conversation_starter && (
              <>
                <p className="font-mono text-xs font-bold pt-1" style={{ color: "var(--accent-secondary)" }}>CONVERSATION STARTER</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {match.conversation_starter}
                </p>
              </>
            )}
          </div>
        )}

        {/* Contact (if they opted in) */}
        {profile.linkedin_url && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>CONNECT</p>
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--accent-primary)" }}
            >
              <span>LinkedIn →</span>
            </a>
          </div>
        )}

        {/* Beacon ping button */}
        {!isOwnProfile && profile.is_beacon_active && (
          <button
            onClick={handlePing}
            disabled={pinged}
            className="w-full py-3 rounded-xl text-sm font-mono font-bold transition-all"
            style={{
              background: pinged
                ? "var(--bg-elevated)"
                : `${profile.beacon_color || primaryColor?.bg || "var(--accent-success)"}15`,
              color: pinged
                ? "var(--text-secondary)"
                : profile.beacon_color || primaryColor?.bg || "var(--accent-success)",
              border: `1px solid ${pinged ? "var(--border-subtle)" : `${profile.beacon_color || primaryColor?.bg || "var(--accent-success)"}30`}`,
            }}
          >
            {pinged ? "Pinged!" : "On my way!"}
          </button>
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

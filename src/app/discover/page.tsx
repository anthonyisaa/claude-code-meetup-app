"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INTEREST_TAGS } from "@/lib/constants";
import ProfileCard from "@/components/ProfileCard";
import BottomNav from "@/components/BottomNav";
import NuxWalkthrough from "@/components/NuxWalkthrough";
import LiveBeaconsFeed from "@/components/LiveBeaconsFeed";

interface DiscoverProfile {
  id: string;
  name: string;
  role: string;
  claude_title: string | null;
  tags: string[];
  photo_url: string | null;
  primary_tag: string | null;
  is_beacon_active: boolean;
  beacon_totem: string | null;
  beacon_color: string | null;
  match_score: number;
  match_reason: string;
  conversation_starter: string;
}

const PAGE_SIZE = 20;

export default function DiscoverPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wavedIds, setWavedIds] = useState<Set<string>>(new Set());
  const [randomProfile, setRandomProfile] = useState<DiscoverProfile | null>(null);
  const [showRandom, setShowRandom] = useState(false);
  const [computing, setComputing] = useState(false);

  // Auth + profile guard
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      supabase.from("profiles").select("id").eq("id", user.id).single()
        .then(({ data }) => { if (!data) router.push("/onboarding"); });
    });
  }, [router]);

  // Load existing sent waves so cards show correct state
  useEffect(() => {
    fetch("/api/waves?type=sent")
      .then((r) => r.json())
      .then((waves) => {
        if (Array.isArray(waves)) {
          setWavedIds(new Set(waves.map((w: { to_user_profile?: { id: string } }) => w.to_user_profile?.id).filter((id): id is string => Boolean(id))));
        }
      })
      .catch(() => {});
  }, []);

  const fetchProfiles = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      if (tagFilter) params.set("tag", tagFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/matching/discover?${params}`);
      const { profiles: raw, total: t } = await res.json();
      // Rename `score` → `match_score` to match ProfileCard props
      const fetched = (raw || []).map((p: DiscoverProfile & { score?: number }) => ({
        ...p,
        match_score: p.score ?? p.match_score ?? 0,
      }));

      if (reset) {
        setProfiles(fetched || []);
        setOffset(PAGE_SIZE);
      } else {
        setProfiles((prev) => [...prev, ...(fetched || [])]);
        setOffset((o) => o + PAGE_SIZE);
      }
      setTotal(t || 0);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, tagFilter, search]);

  // Initial load + refetch on filter/search change
  useEffect(() => {
    fetchProfiles(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilter, search]);

  const handleWave = async (toUserId: string) => {
    setWavedIds((prev) => new Set([...prev, toUserId]));
    try {
      const res = await fetch("/api/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user: toUserId }),
      });
      if (res.ok) {
        const { mutual } = await res.json();
        if (mutual) {
          // Could show a celebration — for now just keep in waved state
        }
      }
    } catch {
      // Optimistic — keep waved state regardless
    }
  };

  const handleRandomMatch = async () => {
    setShowRandom(true);
    setRandomProfile(null);
    const res = await fetch("/api/matching/random");
    const { profile, match_reason, conversation_starter } = await res.json();
    if (profile) {
      setRandomProfile({ ...profile, match_score: 0, match_reason, conversation_starter });
    }
  };

  const handleRecompute = async () => {
    setComputing(true);
    await fetch("/api/matching/compute", { method: "POST" });
    setComputing(false);
    fetchProfiles(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const hasMore = profiles.length < total;

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: "var(--bg-primary)" }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-mono text-xl font-bold">
            <span style={{ color: "var(--accent-primary)" }}>Claude</span> Connect
          </h1>
          <button
            onClick={handleRandomMatch}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            🎲 Random
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative mb-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value) setSearch("");
            }}
            placeholder="Search by name…"
            className="w-full pl-8 pr-4 py-2 rounded-xl text-sm"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm">🔍</span>
        </form>

        {/* Tag filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setTagFilter(null)}
            className="shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors"
            style={{
              background: !tagFilter ? "var(--accent-primary)" : "var(--bg-elevated)",
              color: !tagFilter ? "white" : "var(--text-secondary)",
            }}
          >
            All
          </button>
          {INTEREST_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className="shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors"
              style={{
                background: tagFilter === tag ? "var(--accent-primary)" : "var(--bg-elevated)",
                color: tagFilter === tag ? "white" : "var(--text-secondary)",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Live Beacons */}
        <LiveBeaconsFeed />

        {/* Random match overlay */}
        {showRandom && (
          <div
            className="rounded-2xl p-4 mb-2"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent-secondary)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono text-accent-secondary font-bold">🎲 WILDCARD MATCH</p>
              <button onClick={() => setShowRandom(false)} className="text-text-secondary text-sm">✕</button>
            </div>
            {randomProfile ? (
              <ProfileCard
                {...randomProfile}
                onWave={handleWave}
                waved={wavedIds.has(randomProfile.id)}
              />
            ) : (
              <p className="text-text-secondary text-sm text-center py-4">Finding someone interesting…</p>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
            <p className="text-text-secondary text-sm">Finding your matches…</p>
          </div>
        )}

        {/* No matches yet */}
        {!loading && profiles.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <p className="text-4xl">🔭</p>
            <p className="font-mono font-bold">
              {search || tagFilter ? "No matches found" : "No matches yet"}
            </p>
            <p className="text-text-secondary text-sm max-w-[260px]">
              {search || tagFilter
                ? "Try a different filter or search term"
                : "More matches appear as other attendees register. Check back soon!"}
            </p>
            {!search && !tagFilter && (
              <button
                onClick={handleRecompute}
                disabled={computing}
                className="text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-50"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
              >
                {computing ? "Computing…" : "Refresh matches"}
              </button>
            )}
          </div>
        )}

        {/* Profile cards */}
        {!loading && profiles.map((p, i) => (
          <ProfileCard
            key={p.id}
            {...p}
            onWave={handleWave}
            waved={wavedIds.has(p.id)}
            animationDelay={i * 40}
          />
        ))}

        {/* Load more */}
        {hasMore && !loading && (
          <button
            onClick={() => fetchProfiles(false)}
            disabled={loadingMore}
            className="w-full py-3 text-sm text-text-secondary disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      <NuxWalkthrough />
      <BottomNav />
    </div>
  );
}

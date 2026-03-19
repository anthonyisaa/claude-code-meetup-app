"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GWProfileCard from "@/components/GWProfileCard";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

interface GWProfile {
  id: string;
  name: string;
  work_one_liner: string | null;
  current_season: string | null;
  discussion_topics: string[];
  hoping_for: string | null;
  photo_url: string | null;
  score: number;
  match_reason: string;
  conversation_starter: string;
}

interface TopicOption {
  id: string;
  topic: string;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<GWProfile[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wavedIds, setWavedIds] = useState<Set<string>>(new Set());
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"matched" | "all">("matched");

  // Auth guard + load profile + meetup topics
  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, meetup_id, checked_in")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) { router.push("/onboarding"); return; }

      setCheckedIn(profile.checked_in);

      // Load topic options for this meetup
      if (profile.meetup_id) {
        const { data: topicData } = await supabase
          .from("topic_options")
          .select("id, topic")
          .eq("meetup_id", profile.meetup_id)
          .order("topic");
        setTopics(topicData || []);
      }
    };

    init();
  }, [router]);

  // Load sent waves so cards show correct state
  useEffect(() => {
    fetch("/api/waves?type=sent")
      .then((r) => r.json())
      .then((waves) => {
        if (Array.isArray(waves)) {
          setWavedIds(
            new Set(
              waves
                .map((w: { to_user_profile?: { id: string } }) => w.to_user_profile?.id)
                .filter((id): id is string => Boolean(id))
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (checkedIn === null) return; // wait for init to complete
    if (!checkedIn) { setLoading(false); return; }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (topicFilter) params.set("topic", topicFilter);
      if (search) params.set("search", search);
      params.set("mode", mode);

      const res = await fetch(`/api/matching/discover?${params}`);
      const { profiles: raw, checkedIn: ci } = await res.json();

      if (!ci) setCheckedIn(false);
      setProfiles(raw || []);
    } finally {
      setLoading(false);
    }
  }, [checkedIn, topicFilter, search, mode]);

  useEffect(() => {
    fetchProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicFilter, search, checkedIn, mode]);

  const handleWave = async (toUserId: string) => {
    setWavedIds((prev) => new Set([...prev, toUserId]));
    try {
      await fetch("/api/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user: toUserId }),
      });
      toast.success("Wave sent! 👋", { description: "They'll see your wave in their feed." });
    } catch {
      // Optimistic — keep waved state regardless
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const highlightTopics = topicFilter ? [topicFilter] : [];

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: "var(--bg-primary)" }}>
        <h1 className="font-mono text-xl font-bold mb-1">Discover</h1>
        <p className="text-text-secondary text-xs mb-3">New matches appear as more people arrive. Refresh to see updates!</p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode("matched")}
            className="px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors"
            style={{
              background: mode === "matched" ? "var(--accent-primary)" : "var(--bg-elevated)",
              color: mode === "matched" ? "white" : "var(--text-secondary)",
            }}
          >
            Matches
          </button>
          <button
            onClick={() => setMode("all")}
            className="px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors"
            style={{
              background: mode === "all" ? "var(--accent-primary)" : "var(--bg-elevated)",
              color: mode === "all" ? "white" : "var(--text-secondary)",
            }}
          >
            Browse All
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

        {/* Topic filter pills */}
        {topics.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setTopicFilter(null)}
              className="shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors"
              style={{
                background: !topicFilter ? "var(--accent-primary)" : "var(--bg-elevated)",
                color: !topicFilter ? "white" : "var(--text-secondary)",
              }}
            >
              All
            </button>
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => setTopicFilter(topicFilter === t.topic ? null : t.topic)}
                className="shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors"
                style={{
                  background: topicFilter === t.topic ? "var(--accent-primary)" : "var(--bg-elevated)",
                  color: topicFilter === t.topic ? "white" : "var(--text-secondary)",
                }}
              >
                {t.topic}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 space-y-3">
        {/* Check-in gate */}
        {checkedIn === false && (
          <div
            className="rounded-2xl p-6 text-center flex flex-col items-center gap-3 mt-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="text-4xl">⏳</p>
            <h2 className="font-mono font-bold text-base">Not checked in yet</h2>
            <p className="text-text-secondary text-sm max-w-[280px]">
              Your host will check you in when the event starts. Matches will appear here once you&apos;re in.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && checkedIn !== false && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
            />
            <p className="text-text-secondary text-sm">Finding your matches…</p>
          </div>
        )}

        {/* No matches */}
        {!loading && checkedIn && profiles.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 text-center mt-4">
            <p className="text-4xl">🔭</p>
            <p className="font-mono font-bold">
              {search || topicFilter
                ? "No matches found"
                : mode === "all"
                ? "No attendees yet"
                : "No matches yet"}
            </p>
            <p className="text-text-secondary text-sm max-w-[260px]">
              {search || topicFilter
                ? "Try a different filter or search term"
                : mode === "all"
                ? "No one else has been checked in yet. Check back once more people arrive!"
                : "Matches appear once your host runs the matching. Try 'Browse All' to see everyone who's here."}
            </p>
          </div>
        )}

        {/* Topic grouping label */}
        {!loading && checkedIn && profiles.length > 0 && topicFilter && (
          <p className="text-xs font-mono font-bold pt-1" style={{ color: "var(--text-secondary)" }}>
            {profiles.length} {profiles.length === 1 ? "person" : "people"} talking about &ldquo;{topicFilter}&rdquo;
          </p>
        )}

        {/* Profile cards */}
        {!loading && checkedIn && profiles.map((p, i) => (
          <GWProfileCard
            key={p.id}
            id={p.id}
            name={p.name}
            work_one_liner={p.work_one_liner}
            current_season={p.current_season}
            discussion_topics={p.discussion_topics}
            hoping_for={p.hoping_for}
            photo_url={p.photo_url}
            match_score={p.score}
            match_reason={p.match_reason}
            conversation_starter={p.conversation_starter}
            onWave={handleWave}
            waved={wavedIds.has(p.id)}
            animationDelay={i * 40}
            highlightTopics={highlightTopics}
            isTopMatch={i === 0 && mode === "matched" && p.score > 0}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

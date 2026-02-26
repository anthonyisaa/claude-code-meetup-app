"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TOTEMS, PIXEL_COLORS, BG_COLORS, type Totem } from "@/lib/totems";
import BottomNav from "@/components/BottomNav";
import PixelTotem from "@/components/PixelTotem";

interface IncomingPing {
  id: string;
  name: string;
  created_at: string;
}

/* ─── Totem Thumbnail (for picker) ─── */
function TotemThumb({
  totem,
  color,
  selected,
  onClick,
}: {
  totem: Totem;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  const cols = totem.grid[0].length;
  const rows = totem.grid.length;
  const cell = Math.floor(36 / Math.max(rows, cols));

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 transition-all"
      style={{
        opacity: selected ? 1 : 0.45,
        transform: selected ? "scale(1.08)" : "scale(1)",
      }}
    >
      <div
        className="rounded-xl p-2 transition-all"
        style={{
          background: selected ? "var(--bg-elevated)" : "transparent",
          border: selected
            ? `2px solid ${color}`
            : "2px solid transparent",
          boxShadow: selected ? `0 0 16px ${color}30` : "none",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
            gridTemplateRows: `repeat(${rows}, ${cell}px)`,
            gap: "1px",
          }}
        >
          {totem.grid.flatMap((row, r) =>
            row.split("").map((c, ci) => (
              <div
                key={`${r}-${ci}`}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 1,
                  background:
                    c === "0"
                      ? "transparent"
                      : c === "2"
                        ? "var(--bg-primary)"
                        : color,
                }}
              />
            ))
          )}
        </div>
      </div>
      <span
        className="font-mono text-[10px] font-bold"
        style={{ color: selected ? color : "var(--text-secondary)" }}
      >
        {totem.name}
      </span>
    </button>
  );
}

/* ─── Main Beacon Page ─── */
export default function BeaconPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    name: string;
    claude_title: string | null;
    beacon_totem: string | null;
    beacon_color: string | null;
    beacon_bg: string | null;
    is_beacon_active: boolean;
  } | null>(null);

  const [selectedTotem, setSelectedTotem] = useState(TOTEMS[0].id);
  const [selectedColor, setSelectedColor] = useState(PIXEL_COLORS[0].hex);
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0].hex);
  const [isLive, setIsLive] = useState(false);
  const [activating, setActivating] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [latestPing, setLatestPing] = useState<IncomingPing | null>(null);
  const [showPingToast, setShowPingToast] = useState(false);
  const pingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beaconStartRef = useRef<string | null>(null);

  // Auth guard + load saved preferences
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select(
          "name, claude_title, beacon_totem, beacon_color, beacon_bg, is_beacon_active"
        )
        .eq("id", user.id)
        .single();
      if (!data) {
        router.push("/onboarding");
        return;
      }
      setProfile(data);
      if (data.beacon_totem) setSelectedTotem(data.beacon_totem);
      if (data.beacon_color) setSelectedColor(data.beacon_color);
      if (data.beacon_bg) setSelectedBg(data.beacon_bg);
      if (data.is_beacon_active) setIsLive(true);
      setLoading(false);
    });
  }, [router]);

  // Wake Lock — keep screen on during beacon
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Wake Lock not supported or denied
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    if (isLive) requestWakeLock();
    else releaseWakeLock();
    return releaseWakeLock;
  }, [isLive, requestWakeLock, releaseWakeLock]);

  // Poll for incoming pings while live
  useEffect(() => {
    if (!isLive) {
      if (pingPollRef.current) clearInterval(pingPollRef.current);
      return;
    }

    beaconStartRef.current = new Date().toISOString();
    setPingCount(0);

    const poll = async () => {
      try {
        const since = beaconStartRef.current || new Date().toISOString();
        const res = await fetch(`/api/beacon/ping?since=${since}`);
        const { pings } = await res.json();
        if (pings && pings.length > 0) {
          setPingCount(pings.length);
          const newest = pings[0];
          setLatestPing({
            id: newest.id,
            name: newest.profiles?.name ?? "Someone",
            created_at: newest.created_at,
          });
          setShowPingToast(true);
          setTimeout(() => setShowPingToast(false), 3000);
        }
      } catch {
        // Silently fail
      }
    };

    poll();
    pingPollRef.current = setInterval(poll, 5_000);

    return () => {
      if (pingPollRef.current) clearInterval(pingPollRef.current);
    };
  }, [isLive]);

  const goLive = async () => {
    setActivating(true);
    try {
      await fetch("/api/beacon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_beacon_active: true,
          beacon_totem: selectedTotem,
          beacon_color: selectedColor,
          beacon_bg: selectedBg,
        }),
      });
      setIsLive(true);
    } finally {
      setActivating(false);
    }
  };

  const goOffline = async () => {
    setIsLive(false);
    await fetch("/api/beacon", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_beacon_active: false }),
    });
  };

  const totem = TOTEMS.find((t) => t.id === selectedTotem) || TOTEMS[0];

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "var(--accent-primary)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  // ─── LIVE MODE — full screen takeover ───
  if (isLive) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
        style={{ background: selectedBg }}
        onClick={goOffline}
      >
        {/* Ambient glow behind totem */}
        <div
          className="absolute rounded-full blur-3xl opacity-20 animate-beacon-pulse"
          style={{
            width: 360,
            height: 360,
            background: selectedColor,
            "--tag-glow": selectedColor,
          } as React.CSSProperties}
        />

        {/* Pixel Totem */}
        <div className="relative z-10 animate-beacon-pulse rounded-3xl p-6"
          style={{ "--tag-glow": selectedColor } as React.CSSProperties}
        >
          <PixelTotem
            totem={totem}
            color={selectedColor}
            bgColor={selectedBg}
            size={280}
          />
        </div>

        {/* Name */}
        <h1
          className="relative z-10 font-mono text-3xl font-bold mt-8 tracking-tight"
          style={{ color: selectedColor }}
        >
          {profile?.name}
        </h1>

        {/* Claude title */}
        {profile?.claude_title && (
          <p
            className="relative z-10 font-mono text-base mt-2 max-w-[300px] text-center leading-relaxed"
            style={{ color: selectedColor, opacity: 0.6 }}
          >
            {profile.claude_title}
          </p>
        )}

        {/* LIVE badge + ping counter */}
        <div className="relative z-10 mt-6 flex items-center gap-3">
          <div
            className="animate-live-pulse px-4 py-1.5 rounded-full text-sm font-mono font-bold tracking-widest"
            style={{
              background: `${selectedColor}15`,
              color: selectedColor,
              border: `1px solid ${selectedColor}30`,
            }}
          >
            LIVE
          </div>
          {pingCount > 0 && (
            <div
              className="px-3 py-1.5 rounded-full text-sm font-mono font-bold"
              style={{
                background: `${selectedColor}20`,
                color: selectedColor,
                border: `1px solid ${selectedColor}40`,
              }}
            >
              {pingCount} ping{pingCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Ping toast */}
        {showPingToast && latestPing && (
          <div
            className="absolute top-12 z-20 animate-fade-up px-5 py-3 rounded-2xl font-mono text-sm font-bold"
            style={{
              background: `${selectedColor}20`,
              color: selectedColor,
              border: `1px solid ${selectedColor}40`,
              backdropFilter: "blur(8px)",
            }}
          >
            {latestPing.name} is on the way!
          </div>
        )}

        {/* Exit hint */}
        <p
          className="absolute bottom-10 text-xs font-mono tracking-wide z-10"
          style={{ color: selectedColor, opacity: 0.25 }}
        >
          tap anywhere to exit
        </p>
      </div>
    );
  }

  // ─── SETUP MODE ───
  return (
    <div className="min-h-dvh pb-28">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <h1 className="font-mono text-xl font-bold">
          <span style={{ color: "var(--accent-primary)" }}>Beacon</span> Mode
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Go live with your pixel totem. Let your matches spot you in the crowd.
        </p>
      </div>

      {/* Preview */}
      <div className="flex justify-center py-8">
        <div
          className="rounded-3xl p-8 transition-all duration-300"
          style={{
            background: selectedBg,
            border: `1px solid ${selectedColor}25`,
            boxShadow: `0 0 40px ${selectedColor}15`,
          }}
        >
          <PixelTotem
            totem={totem}
            color={selectedColor}
            bgColor={selectedBg}
            size={180}
          />
        </div>
      </div>

      {/* Combo counter */}
      <p className="text-center text-text-secondary text-xs font-mono mb-6">
        {TOTEMS.length} &times; {PIXEL_COLORS.length} &times;{" "}
        {BG_COLORS.length} ={" "}
        <span style={{ color: "var(--accent-primary)" }}>
          {TOTEMS.length * PIXEL_COLORS.length * BG_COLORS.length}
        </span>{" "}
        unique combos
      </p>

      {/* ─── Totem Picker ─── */}
      <div className="px-4 mb-6">
        <p className="font-mono text-sm font-bold mb-3 text-text-secondary">
          Choose your totem
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {TOTEMS.map((t) => (
            <TotemThumb
              key={t.id}
              totem={t}
              color={selectedColor}
              selected={selectedTotem === t.id}
              onClick={() => setSelectedTotem(t.id)}
            />
          ))}
        </div>
      </div>

      {/* ─── Color Picker ─── */}
      <div className="px-4 mb-6">
        <p className="font-mono text-sm font-bold mb-3 text-text-secondary">
          Pick a color
        </p>
        <div className="flex flex-wrap gap-2.5">
          {PIXEL_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c.hex)}
              className="relative w-10 h-10 rounded-xl transition-all"
              style={{
                background: c.hex,
                boxShadow:
                  selectedColor === c.hex
                    ? `0 0 0 2px var(--bg-primary), 0 0 0 4px ${c.hex}, 0 0 16px ${c.hex}40`
                    : "none",
                transform:
                  selectedColor === c.hex ? "scale(1.1)" : "scale(1)",
              }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* ─── Background Picker ─── */}
      <div className="px-4 mb-8">
        <p className="font-mono text-sm font-bold mb-3 text-text-secondary">
          Background
        </p>
        <div className="flex flex-wrap gap-2.5">
          {BG_COLORS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => setSelectedBg(bg.hex)}
              className="relative w-10 h-10 rounded-xl transition-all"
              style={{
                background: bg.hex,
                border:
                  selectedBg === bg.hex
                    ? `2px solid ${selectedColor}`
                    : "1px solid var(--border-hover)",
                boxShadow:
                  selectedBg === bg.hex
                    ? `0 0 12px ${selectedColor}30`
                    : "none",
                transform:
                  selectedBg === bg.hex ? "scale(1.1)" : "scale(1)",
              }}
              title={bg.name}
            />
          ))}
        </div>
      </div>

      {/* ─── GO LIVE Button ─── */}
      <div className="px-4">
        <button
          onClick={goLive}
          disabled={activating}
          className="w-full py-4 rounded-2xl font-mono text-lg font-bold tracking-wide transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${selectedColor}, ${selectedColor}CC)`,
            color: "#FFFFFF",
            boxShadow: `0 4px 24px ${selectedColor}40`,
          }}
        >
          {activating ? "Activating…" : "GO LIVE"}
        </button>
        <p className="text-center text-text-secondary text-xs mt-3">
          Your screen becomes your beacon — hold it up so others can find you
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

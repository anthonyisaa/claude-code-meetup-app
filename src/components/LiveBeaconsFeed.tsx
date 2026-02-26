"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TAG_COLORS } from "@/lib/constants";
import MiniTotem from "./MiniTotem";

interface LiveBeacon {
  id: string;
  name: string;
  role: string;
  claude_title: string | null;
  photo_url: string | null;
  primary_tag: string | null;
  beacon_totem: string | null;
  beacon_color: string | null;
  beacon_bg: string | null;
  beacon_activated_at: string | null;
}

export default function LiveBeaconsFeed({
  onPing,
}: {
  onPing?: (userId: string) => void;
}) {
  const [beacons, setBeacons] = useState<LiveBeacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [pingedIds, setPingedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBeacons();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBeacons, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBeacons() {
    try {
      const res = await fetch("/api/beacon/live");
      const { beacons: data } = await res.json();
      setBeacons(data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handlePing(userId: string) {
    setPingedIds((prev) => new Set([...prev, userId]));
    try {
      const res = await fetch("/api/beacon/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user: userId }),
      });
      if (res.ok) {
        onPing?.(userId);
      }
    } catch {
      // Keep optimistic state
    }
  }

  if (loading || beacons.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-2 h-2 rounded-full animate-live-pulse"
          style={{ background: "var(--accent-success)" }}
        />
        <p className="font-mono text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
          LIVE NOW
        </p>
        <span className="text-text-secondary text-[10px]">
          {beacons.length} beacon{beacons.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
        {beacons.map((b) => {
          const color = b.beacon_color || "#DC6B2F";
          const bg = b.beacon_bg || "#0A0A0F";
          const primaryColor = b.primary_tag ? TAG_COLORS[b.primary_tag] : null;
          const pinged = pingedIds.has(b.id);

          return (
            <div
              key={b.id}
              className="shrink-0 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: `1px solid ${color}30`,
                width: 130,
              }}
            >
              {/* Totem + avatar */}
              <Link href={`/profile/${b.id}`} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: bg }}
                >
                  {b.beacon_totem ? (
                    <MiniTotem totemId={b.beacon_totem} color={color} size={32} />
                  ) : (
                    <span
                      className="w-3 h-3 rounded-full animate-live-pulse"
                      style={{ background: color }}
                    />
                  )}
                </div>
                <p className="text-xs font-semibold truncate w-full text-center">{b.name}</p>
                {b.claude_title && (
                  <p
                    className="text-[10px] font-mono truncate w-full text-center"
                    style={{ color: primaryColor?.bg ?? "var(--accent-primary)" }}
                  >
                    {b.claude_title}
                  </p>
                )}
              </Link>

              {/* Ping button */}
              <button
                onClick={() => handlePing(b.id)}
                disabled={pinged}
                className="w-full py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all"
                style={{
                  background: pinged ? "var(--bg-elevated)" : `${color}20`,
                  color: pinged ? "var(--text-secondary)" : color,
                  border: `1px solid ${pinged ? "var(--border-subtle)" : `${color}30`}`,
                }}
              >
                {pinged ? "Pinged" : "On my way!"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { TAG_COLORS } from "@/lib/constants";
import { TOTEMS } from "@/lib/totems";
import MiniTotem from "./MiniTotem";

interface ProfileCardProps {
  id: string;
  name: string;
  role: string;
  claude_title: string | null;
  tags: string[];
  photo_url: string | null;
  primary_tag: string | null;
  is_beacon_active?: boolean;
  beacon_totem?: string | null;
  beacon_color?: string | null;
  match_score?: number;
  match_reason?: string;
  onWave?: (id: string) => void;
  waved?: boolean;
  animationDelay?: number;
}

function Avatar({ name, photo_url, primary_tag, size = 56 }: {
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
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: color ? `${color.bg}30` : "var(--bg-elevated)",
        color: color ? color.bg : "var(--text-secondary)",
        border: `1.5px solid ${color ? color.bg : "var(--border-subtle)"}`,
        fontSize: size * 0.3,
      }}
    >
      {initials}
    </div>
  );
}

export default function ProfileCard({
  id, name, role, claude_title, tags, photo_url, primary_tag,
  is_beacon_active, beacon_totem, beacon_color,
  match_score, match_reason,
  onWave, waved, animationDelay = 0,
}: ProfileCardProps) {
  const primaryColor = primary_tag ? TAG_COLORS[primary_tag] : null;

  return (
    <div
      className="animate-fade-up rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        animationDelay: `${animationDelay}ms`,
        animationFillMode: "both",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <Link href={`/profile/${id}`}>
            <Avatar name={name} photo_url={photo_url} primary_tag={primary_tag} size={52} />
          </Link>
          {is_beacon_active && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 animate-live-pulse"
              style={{
                background: primaryColor?.bg ?? "var(--accent-success)",
                borderColor: "var(--bg-secondary)",
              }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${id}`} className="hover:opacity-80">
              <p className="font-semibold text-sm truncate">{name}</p>
            </Link>
            {is_beacon_active && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded animate-live-pulse"
                style={{ background: `${primaryColor?.bg ?? "var(--accent-success)"}20`, color: primaryColor?.bg ?? "var(--accent-success)" }}
              >
                <MiniTotem
                  totemId={beacon_totem || TOTEMS[0].id}
                  color={beacon_color || primaryColor?.bg || "var(--accent-success)"}
                  size={12}
                />
                LIVE
              </span>
            )}
          </div>
          <p className="text-text-secondary text-xs truncate">{role}</p>
          {claude_title && (
            <p className="font-mono text-xs mt-0.5 truncate" style={{ color: "var(--accent-primary)" }}>
              {claude_title}
            </p>
          )}
        </div>

        {match_score !== undefined && (
          <div className="text-right shrink-0">
            <p className="font-mono text-lg font-bold" style={{ color: scoreColor(match_score) }}>
              {match_score}
            </p>
            <p className="text-text-secondary text-[10px]">match</p>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag) => {
            const c = TAG_COLORS[tag];
            return (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
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
      )}

      {/* Match reason */}
      {match_reason && (
        <p className="text-text-secondary text-xs italic leading-relaxed">
          &ldquo;{match_reason}&rdquo;
        </p>
      )}

      {/* Wave button */}
      {onWave && (
        <button
          onClick={() => onWave(id)}
          disabled={waved}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
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
  );
}

function scoreColor(score: number) {
  if (score >= 75) return "var(--accent-success)";
  if (score >= 50) return "var(--accent-primary)";
  return "var(--text-secondary)";
}

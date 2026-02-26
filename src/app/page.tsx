"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TOTEMS, PIXEL_COLORS } from "@/lib/totems";

/* ─── Tiny pixel totem renderer for the landing page ─── */
function MiniTotem({
  gridData,
  color,
  cellSize,
}: {
  gridData: string[];
  color: string;
  cellSize: number;
}) {
  const cols = gridData[0].length;
  const rows = gridData.length;
  const gap = Math.max(1, Math.floor(cellSize * 0.08));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {gridData.flatMap((row, r) =>
        row.split("").map((cell, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: Math.max(1, cellSize * 0.12),
              background:
                cell === "0"
                  ? "transparent"
                  : cell === "2"
                    ? "#0A0A0F"
                    : color,
              boxShadow:
                cell === "1" ? `0 0 ${cellSize * 0.5}px ${color}25` : "none",
            }}
          />
        ))
      )}
    </div>
  );
}

/* ─── Floating totem that drifts around ─── */
function FloatingTotem({
  totemIndex,
  colorIndex,
  style,
}: {
  totemIndex: number;
  colorIndex: number;
  style: React.CSSProperties;
}) {
  const totem = TOTEMS[totemIndex % TOTEMS.length];
  const color = PIXEL_COLORS[colorIndex % PIXEL_COLORS.length];

  return (
    <div
      className="absolute opacity-[0.08] pointer-events-none"
      style={style}
    >
      <MiniTotem gridData={totem.grid} color={color.hex} cellSize={5} />
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Build your profile",
    desc: "2 minutes. Pick your interests, share what you're building.",
    icon: "⬡",
  },
  {
    step: "02",
    title: "Get AI-matched",
    desc: "Claude finds who you should meet based on shared vibes.",
    icon: "✦",
  },
  {
    step: "03",
    title: "Wave & connect",
    desc: "Send waves. When it's mutual, swap details and go find them.",
    icon: "👋",
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState({ total_users: 0, total_connections: 0 });

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  // Hero totem — the Bot in Claude orange
  const botTotem = TOTEMS[0];

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Background floating totems */}
      {[
        { totemIndex: 1, colorIndex: 1, style: { top: "8%", left: "5%", transform: "rotate(-12deg)" } },
        { totemIndex: 2, colorIndex: 3, style: { top: "15%", right: "8%", transform: "rotate(8deg)" } },
        { totemIndex: 4, colorIndex: 5, style: { top: "55%", left: "2%", transform: "rotate(15deg)" } },
        { totemIndex: 7, colorIndex: 0, style: { top: "70%", right: "5%", transform: "rotate(-8deg)" } },
        { totemIndex: 9, colorIndex: 4, style: { bottom: "12%", left: "15%", transform: "rotate(6deg)" } },
        { totemIndex: 3, colorIndex: 8, style: { bottom: "25%", right: "12%", transform: "rotate(-18deg)" } },
      ].map((props, i) => (
        <FloatingTotem key={i} {...props} />
      ))}

      {/* ─── Hero Section ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center relative z-10">
        {/* Glow */}
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "var(--accent-primary)" }}
        />

        {/* Pixel Bot mascot */}
        <div className="relative mb-6 animate-fade-up">
          <div
            className="animate-beacon-pulse rounded-2xl p-5"
            style={{ "--tag-glow": "var(--accent-primary)" } as React.CSSProperties}
          >
            <MiniTotem
              gridData={botTotem.grid}
              color="#DC6B2F"
              cellSize={10}
            />
          </div>
        </div>

        {/* Title */}
        <h1
          className="font-mono text-5xl font-extrabold tracking-tight mb-3 animate-fade-up"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          <span style={{ color: "var(--accent-primary)" }}>Claude</span>
          <br />
          Connect
        </h1>

        <p
          className="text-text-secondary text-lg mb-1 animate-fade-up"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          Claude Code Meetup Singapore
        </p>
        <p
          className="text-text-secondary text-sm mb-8 max-w-[280px] animate-fade-up"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          AI-powered matching to help you find the right people in a room of 800.
        </p>

        {/* CTA */}
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-10 py-4 bg-accent-primary text-white font-semibold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform animate-fade-up"
          style={{
            boxShadow: "0 0 30px rgba(220, 107, 47, 0.35)",
            animationDelay: "400ms",
            animationFillMode: "both",
          }}
        >
          Get Started
        </Link>

        {/* Live stats */}
        <div
          className="mt-10 flex items-center gap-8 animate-fade-up"
          style={{ animationDelay: "500ms", animationFillMode: "both" }}
        >
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-text-primary">
              {stats.total_users || "800+"}
            </div>
            <div className="text-text-secondary text-xs mt-0.5">Attendees</div>
          </div>
          <div
            className="w-px h-8"
            style={{ background: "var(--border-subtle)" }}
          />
          <div className="text-center">
            <div
              className="font-mono text-2xl font-bold"
              style={{ color: "var(--accent-success)" }}
            >
              {stats.total_connections}
            </div>
            <div className="text-text-secondary text-xs mt-0.5">
              Connections made
            </div>
          </div>
        </div>
      </div>

      {/* ─── How It Works ─── */}
      <div className="px-6 pb-16 relative z-10">
        <h2
          className="font-mono text-sm font-bold text-text-secondary uppercase tracking-widest mb-6 text-center"
        >
          How it works
        </h2>

        <div className="space-y-4">
          {HOW_IT_WORKS.map((item, i) => (
            <div
              key={item.step}
              className="flex items-start gap-4 rounded-2xl p-4 animate-fade-up"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                animationDelay: `${600 + i * 100}ms`,
                animationFillMode: "both",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{
                  background: "rgba(220, 107, 47, 0.1)",
                  color: "var(--accent-primary)",
                }}
              >
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-text-secondary">
                    {item.step}
                  </span>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-text-secondary text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <Link
          href="/auth/login"
          className="mt-8 w-full inline-flex items-center justify-center py-4 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 animate-fade-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-hover)",
            color: "var(--text-primary)",
            animationDelay: "900ms",
            animationFillMode: "both",
          }}
        >
          Scan. Sign up. Start matching. →
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

const NUX_KEY = "claude-connect-nux-seen";

const STEPS = [
  {
    icon: "✦",
    color: "#DC6B2F",
    title: "Discover",
    body: "Your AI-matched feed. Claude scored every attendee pair — the best matches are at the top.",
  },
  {
    icon: "👋",
    color: "#F59E0B",
    title: "Wave",
    body: "See someone interesting? Wave at them. If they wave back, you're connected and can swap details.",
  },
  {
    icon: "◉",
    color: "#7C3AED",
    title: "Beacon",
    body: "Pick a pixel totem, go live, and hold up your phone. Your matches can spot your glowing avatar across the room.",
  },
  {
    icon: "📡",
    color: "#0EA5E9",
    title: "Live Beacons",
    body: "See who's live right now at the top of Discover. Tap their card to see their totem and colors — that's what to look for. Send an \"on my way\" ping to let them know you're coming.",
  },
  {
    icon: "🤝",
    color: "#10B981",
    title: "Connect",
    body: "Mutual waves become connections. See their LinkedIn, email, and chat to coordinate meeting up.",
  },
];

export default function NuxWalkthrough() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(NUX_KEY);
    if (!seen) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(NUX_KEY, "1");
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[480px] mx-auto rounded-t-3xl px-6 pt-8 pb-10 animate-fade-up"
        style={{
          background: "var(--bg-secondary)",
          borderTop: `2px solid ${current.color}40`,
        }}
      >
        {/* Skip button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-5 text-text-secondary text-xs font-mono hover:text-text-primary transition-colors"
        >
          Skip
        </button>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                background: i === step ? current.color : "var(--border-hover)",
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: `${current.color}15`,
              boxShadow: `0 0 30px ${current.color}20`,
            }}
          >
            {current.icon}
          </div>
        </div>

        {/* Content */}
        <h2
          className="font-mono text-xl font-bold text-center mb-2"
          style={{ color: current.color }}
        >
          {current.title}
        </h2>
        <p className="text-text-secondary text-sm text-center leading-relaxed max-w-[300px] mx-auto mb-8">
          {current.body}
        </p>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={back}
              className="flex-1 py-3.5 rounded-xl font-semibold text-sm"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-[2] py-3.5 rounded-xl font-semibold text-sm text-white transition-transform active:scale-[0.98]"
            style={{
              background: current.color,
              boxShadow: `0 4px 20px ${current.color}40`,
            }}
          >
            {isLast ? "Let's go!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_SEASONS, HOPING_FOR } from "@/lib/constants";
import imageCompression from "browser-image-compression";

interface TopicOption {
  id: string;
  label: string;
  display_order: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  // Meetup context (set by /join/[code] and stored in localStorage)
  const [meetupId, setMeetupId] = useState<string | null>(null);
  const [meetupName, setMeetupName] = useState<string>("");
  const [topicOptions, setTopicOptions] = useState<TopicOption[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [workOneLiner, setWorkOneLiner] = useState("");
  const [currentSeason, setCurrentSeason] = useState<string | null>(null);
  const [otherSeasonText, setOtherSeasonText] = useState("");
  const [discussionTopics, setDiscussionTopics] = useState<string[]>([]);
  const [hopingFor, setHopingFor] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinPublic, setLinkedinPublic] = useState(false);
  const [shareEmail, setShareEmail] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // On mount: check auth, detect returning user, load meetup context and topic options
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returning = params.get("returning") === "true";
    if (returning) setIsReturning(true);

    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }

      // Check if profile already exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // New user who somehow already has a profile → skip to discover
      // Returning users are expected to have a profile, so we let them through
      if (profile && !returning) { router.push("/discover"); return; }

      // Load meetup from localStorage (set by /join/[code])
      const storedMeetupId = localStorage.getItem("gw_meetup_id");
      const storedMeetupName = localStorage.getItem("gw_meetup_name");

      if (!storedMeetupId) {
        setError("No meetup found. Please use the invite link from your host.");
        return;
      }

      setMeetupId(storedMeetupId);
      setMeetupName(storedMeetupName || "your meetup");

      // Load topic options for this meetup
      const { data: topics } = await supabase
        .from("topic_options")
        .select("id, label, display_order")
        .eq("meetup_id", storedMeetupId)
        .order("display_order");

      setTopicOptions(topics || []);
    });
  }, [router]);

  const toggleTopic = (label: string) => {
    setDiscussionTopics((prev) =>
      prev.includes(label)
        ? prev.filter((t) => t !== label)
        : prev.length < 3
        ? [...prev, label]
        : prev
    );
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      });
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const formData = new FormData();
    formData.append("file", photoFile);
    const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  // Full onboarding submit (new users)
  const handleSubmit = async () => {
    if (!meetupId || !currentSeason || !hopingFor) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const photo_url = await uploadPhoto();

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          work_one_liner: workOneLiner,
          current_season: currentSeason === "other" ? otherSeasonText.trim() : currentSeason,
          discussion_topics: discussionTopics,
          hoping_for: hopingFor,
          linkedin_url: linkedinUrl || null,
          linkedin_public: linkedinPublic,
          share_email: shareEmail,
          meetup_id: meetupId,
          photo_url,
        }),
      });

      if (!res.ok) {
        const { error: err } = await res.json();
        setError(err || "Something went wrong");
        return;
      }

      localStorage.removeItem("gw_meetup_id");
      localStorage.removeItem("gw_meetup_name");
      router.push("/discover");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Short onboarding submit (returning users — updates topics + hoping for for the new meetup)
  const handleReturningSubmit = async () => {
    if (!meetupId || !hopingFor) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetup_id: meetupId,
          discussion_topics: discussionTopics,
          hoping_for: hopingFor,
          checked_in: false,
        }),
      });

      if (!res.ok) {
        const { error: err } = await res.json();
        setError(err || "Something went wrong");
        return;
      }

      localStorage.removeItem("gw_meetup_id");
      localStorage.removeItem("gw_meetup_name");
      router.push("/discover");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // No meetup context error
  if (error && !meetupId) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-8 text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="font-mono text-xl font-bold mb-2">Missing invite link</h1>
        <p className="text-text-secondary text-sm">{error}</p>
      </div>
    );
  }

  // ── Returning user: 2-step short onboarding ──────────────────────────────
  if (isReturning) {
    const TOTAL_STEPS = 2;
    const canProceedTopics = discussionTopics.length >= 1 || topicOptions.length === 0;
    const canProceedHoping = hopingFor !== null;

    return (
      <div className="min-h-dvh flex flex-col px-6 py-8">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i < step ? "var(--accent-primary)" : "var(--border-subtle)" }}
            />
          ))}
        </div>

        {meetupName && (
          <p className="text-text-secondary text-xs mb-6">{meetupName}</p>
        )}

        {/* Step 1: Discussion topics */}
        {step === 1 && (
          <div className="flex flex-col flex-1 animate-fade-up">
            <h1 className="font-mono text-2xl font-bold mb-1">Welcome back! 👋</h1>
            <p className="text-text-secondary text-sm mb-6">
              What do you want to talk about at this meetup? Pick up to 3 · {discussionTopics.length}/3 selected
            </p>

            {topicOptions.length === 0 ? (
              <p className="text-text-secondary text-sm">No topics set for this meetup yet. You can continue.</p>
            ) : (
              <div className="flex flex-col gap-3 mb-auto">
                {topicOptions.map((topic) => {
                  const active = discussionTopics.includes(topic.label);
                  return (
                    <button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.label)}
                      className="w-full px-4 py-3.5 rounded-xl text-left font-medium transition-all"
                      style={{
                        background: active ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                        color: active ? "var(--accent-primary)" : "var(--text-primary)",
                        border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                      }}
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-auto pt-8">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedTopics}
                className="w-full py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Hoping for */}
        {step === 2 && (
          <div className="flex flex-col flex-1 animate-fade-up">
            <h1 className="font-mono text-2xl font-bold mb-1">What are you hoping for?</h1>
            <p className="text-text-secondary text-sm mb-6">Pick what resonates most for this meetup</p>

            <div className="flex flex-col gap-3 mb-auto">
              {HOPING_FOR.map((h) => {
                const active = hopingFor === h.value;
                return (
                  <button
                    key={h.value}
                    onClick={() => setHopingFor(h.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-left transition-all"
                    style={{
                      background: active ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                      border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <p className="font-medium" style={{ color: active ? "var(--accent-primary)" : "var(--text-primary)" }}>
                      {h.label}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">{h.description}</p>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl">
                Back
              </button>
              <button
                onClick={handleReturningSubmit}
                disabled={loading || !canProceedHoping}
                className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-50 transition-opacity"
              >
                {loading ? "Saving..." : "I'm ready 👋"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── New user: full 5-step onboarding ─────────────────────────────────────
  const TOTAL_STEPS = 5;
  const canProceedStep1 = name.trim().length > 0;
  const canProceedStep2 = workOneLiner.trim().length > 0;
  const canProceedStep3 = currentSeason !== null && (currentSeason !== "other" || otherSeasonText.trim().length > 0);
  const canProceedStep4 = discussionTopics.length >= 1;
  const canProceedStep5 = hopingFor !== null;

  return (
    <div className="min-h-dvh flex flex-col px-6 py-8">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < step ? "var(--accent-primary)" : "var(--border-subtle)" }}
          />
        ))}
      </div>

      {meetupName && (
        <p className="text-text-secondary text-xs mb-6">{meetupName}</p>
      )}

      {/* Step 1: Name + photo */}
      {step === 1 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">Let&apos;s build your profile</h1>
          <p className="text-text-secondary text-sm mb-8">Takes 3 minutes, tops!</p>

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl shrink-0 overflow-hidden transition-opacity hover:opacity-80"
              style={{
                background: photoPreview ? "transparent" : "var(--bg-elevated)",
                border: `2px dashed ${photoPreview ? "transparent" : "var(--border-hover)"}`,
              }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                : "📷"
              }
            </button>
            <div>
              <button onClick={() => fileInputRef.current?.click()} className="text-accent-primary text-sm font-medium">
                {photoPreview ? "Change photo" : "Add photo"}
              </button>
              <p className="text-text-secondary text-xs mt-0.5">Optional</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Your name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div className="mt-auto pt-8">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="w-full py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Work one-liner */}
      {step === 2 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">Give us a one-liner of what you do</h1>
          <p className="text-text-secondary text-sm mb-8">Be as creative as you like!</p>

          <div>
            <input
              type="text"
              value={workOneLiner}
              onChange={(e) => setWorkOneLiner(e.target.value.slice(0, 80))}
              placeholder="Building a better world, figuring out the rest."
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
            <p className="text-text-secondary text-xs mt-1 text-right">{workOneLiner.length}/80</p>
          </div>

          <div className="mt-auto pt-8 flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Current season */}
      {step === 3 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">What season are you in?</h1>
          <p className="text-text-secondary text-sm mb-6">Pick the one that feels most true right now</p>

          <div className="flex flex-col gap-3 mb-auto">
            {CURRENT_SEASONS.map((s) => {
              const active = currentSeason === s.value;
              return (
                <div key={s.value}>
                  <button
                    onClick={() => setCurrentSeason(s.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-left flex items-center gap-3 font-medium transition-all"
                    style={{
                      background: active ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                      color: active ? "var(--accent-primary)" : "var(--text-primary)",
                      border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    {s.label}
                  </button>
                  {s.value === "other" && active && (
                    <input
                      type="text"
                      value={otherSeasonText}
                      onChange={(e) => setOtherSeasonText(e.target.value.slice(0, 60))}
                      placeholder="Describe your season…"
                      autoFocus
                      className="w-full mt-2 px-4 py-3 bg-bg-secondary border border-accent-primary rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none transition-colors"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl">
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!canProceedStep3}
              className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Discussion topics */}
      {step === 4 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">What do you want to talk about?</h1>
          <p className="text-text-secondary text-sm mb-6">
            Pick up to 3 · {discussionTopics.length}/3 selected
          </p>

          {topicOptions.length === 0 ? (
            <p className="text-text-secondary text-sm">No topics set for this meetup yet. You can continue.</p>
          ) : (
            <div className="flex flex-col gap-3 mb-auto">
              {topicOptions.map((topic) => {
                const active = discussionTopics.includes(topic.label);
                return (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.label)}
                    className="w-full px-4 py-3.5 rounded-xl text-left font-medium transition-all"
                    style={{
                      background: active ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                      color: active ? "var(--accent-primary)" : "var(--text-primary)",
                      border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    }}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl">
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              disabled={!canProceedStep4 && topicOptions.length > 0}
              className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Hoping for + LinkedIn */}
      {step === 5 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">What are you hoping for?</h1>
          <p className="text-text-secondary text-sm mb-6">Pick what resonates most for this meetup</p>

          <div className="flex flex-col gap-3 mb-6">
            {HOPING_FOR.map((h) => {
              const active = hopingFor === h.value;
              return (
                <button
                  key={h.value}
                  onClick={() => setHopingFor(h.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-left transition-all"
                  style={{
                    background: active ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                    border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  }}
                >
                  <p className="font-medium" style={{ color: active ? "var(--accent-primary)" : "var(--text-primary)" }}>
                    {h.label}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{h.description}</p>
                </button>
              );
            })}
          </div>

          <div
            className="rounded-xl p-4 space-y-4 mb-6"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">LinkedIn</label>
              <div className="flex items-center bg-bg-secondary border border-border-subtle rounded-xl overflow-hidden focus-within:border-accent-primary transition-colors">
                <span className="pl-4 pr-1 text-text-secondary text-sm whitespace-nowrap select-none">linkedin.com/in/</span>
                <input
                  type="text"
                  value={linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "")}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    const match = val.match(/linkedin\.com\/in\/([^/?&#\s]+)/i);
                    if (match) {
                      setLinkedinUrl(`https://linkedin.com/in/${match[1]}`);
                    } else {
                      setLinkedinUrl(val ? `https://linkedin.com/in/${val}` : "");
                    }
                  }}
                  placeholder="yourname"
                  className="flex-1 pr-4 py-3 bg-transparent text-text-primary placeholder:text-text-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Share LinkedIn only after connecting</p>
                <p className="text-xs text-text-secondary mt-0.5">Only shown after a mutual wave</p>
              </div>
              <Toggle checked={shareEmail} onChange={setShareEmail} />
            </label>
          </div>

          {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

          <div className="mt-auto flex gap-3">
            <button onClick={() => setStep(4)} className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceedStep5}
              className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-50 transition-opacity"
            >
              {loading ? "Saving..." : "I'm ready 👋"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: checked ? "var(--accent-primary)" : "var(--bg-primary)" }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

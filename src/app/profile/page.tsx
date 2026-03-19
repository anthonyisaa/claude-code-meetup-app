"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_SEASONS, HOPING_FOR } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";
import imageCompression from "browser-image-compression";

interface MyProfile {
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
  meetup_id: string | null;
}

interface TopicOption {
  id: string;
  topic: string;
}

function Avatar({ name, photo_url, size = 80 }: {
  name: string;
  photo_url: string | null;
  size?: number;
}) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (photo_url) {
    return (
      <img src={photo_url} alt={name} width={size} height={size}
        className="rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-bold"
      style={{
        width: size, height: size,
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

export default function MyProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [topicOptions, setTopicOptions] = useState<TopicOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editOneliner, setEditOneliner] = useState("");
  const [editSeason, setEditSeason] = useState("");
  const [editTopics, setEditTopics] = useState<string[]>([]);
  const [editHoping, setEditHoping] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editLinkedinPublic, setEditLinkedinPublic] = useState(false);
  const [editShareEmail, setEditShareEmail] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("id, name, work_one_liner, current_season, discussion_topics, hoping_for, photo_url, linkedin_url, linkedin_public, share_email, meetup_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) { router.push("/onboarding"); return; }
      setProfile(data as MyProfile);

      if (data.meetup_id) {
        const { data: topics } = await supabase
          .from("topic_options")
          .select("id, topic")
          .eq("meetup_id", data.meetup_id)
          .order("topic");
        setTopicOptions(topics || []);
      }

      setLoading(false);
    });
  }, [router]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditOneliner(profile.work_one_liner || "");
    setEditSeason(profile.current_season || "");
    setEditTopics([...profile.discussion_topics]);
    setEditHoping(profile.hoping_for || "");
    setEditLinkedin(profile.linkedin_url || "");
    setEditLinkedinPublic(profile.linkedin_public);
    setEditShareEmail(profile.share_email);
    setPhotoPreview(null);
    setPhotoFile(null);
    setEditing(true);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 400, useWebWorker: true });
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleTopic = (topic: string) => {
    setEditTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : prev.length < 3 ? [...prev, topic] : prev
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setPhotoError(null);

    let newPhotoUrl = profile?.photo_url || null;
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        newPhotoUrl = url;
      } else {
        const json = await res.json().catch(() => ({}));
        setPhotoError(`Photo upload failed: ${json.error ?? res.statusText}`);
        setSaving(false);
        return;
      }
    }

    const body = {
      name: editName.trim(),
      work_one_liner: editOneliner.trim().slice(0, 80) || null,
      current_season: editSeason || null,
      discussion_topics: editTopics,
      hoping_for: editHoping || null,
      linkedin_url: editLinkedin.trim() || null,
      linkedin_public: editLinkedinPublic,
      share_email: editShareEmail,
      photo_url: newPhotoUrl,
    };

    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setProfile((prev) => (prev ? { ...prev, ...body } : prev));
    setEditing(false);
    setSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!profile) return null;

  // ── Edit Mode ──
  if (editing) {
    const canSave = editName.trim().length > 0 && editSeason.length > 0 && editHoping.length > 0;

    return (
      <div className="min-h-dvh pb-28">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <button onClick={() => setEditing(false)} className="text-sm text-text-secondary">Cancel</button>
          <h1 className="font-mono text-lg font-bold">Edit Profile</h1>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="text-sm font-semibold disabled:opacity-40"
            style={{ color: "var(--accent-primary)" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="px-4 space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <button onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl shrink-0 overflow-hidden transition-opacity hover:opacity-80"
              style={{
                background: photoPreview || profile.photo_url ? "transparent" : "var(--bg-elevated)",
                border: `2px dashed ${photoPreview || profile.photo_url ? "transparent" : "var(--border-hover)"}`,
              }}>
              {photoPreview || profile.photo_url ? (
                <img src={photoPreview || profile.photo_url!} alt="Preview" className="w-full h-full object-cover rounded-full" />
              ) : "📷"}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="text-accent-primary text-sm font-medium">
              Change photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>
          {photoError && <p className="text-sm text-red-500">{photoError}</p>}

          {/* Name */}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors" />
          </div>

          {/* Work one-liner */}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">What do you work on?</label>
            <input type="text" value={editOneliner} onChange={(e) => setEditOneliner(e.target.value.slice(0, 80))}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors" />
            <p className="text-text-secondary text-xs mt-1 text-right">{editOneliner.length}/80</p>
          </div>

          {/* Current season */}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">Current season</label>
            <div className="flex flex-col gap-2">
              {CURRENT_SEASONS.map((s) => (
                <button key={s.value} onClick={() => setEditSeason(s.value)}
                  className="w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all"
                  style={{
                    background: editSeason === s.value ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                    color: editSeason === s.value ? "var(--accent-primary)" : "var(--text-primary)",
                    border: `1px solid ${editSeason === s.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discussion topics */}
          {topicOptions.length > 0 && (
            <div>
              <label className="text-sm text-text-secondary mb-2 block">Discussion topics (up to 3)</label>
              <div className="flex flex-wrap gap-2">
                {topicOptions.map((t) => {
                  const active = editTopics.includes(t.topic);
                  return (
                    <button key={t.id} onClick={() => toggleTopic(t.topic)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: active ? "var(--accent-primary)" : "var(--bg-elevated)",
                        color: active ? "white" : "var(--text-secondary)",
                        border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                      }}>
                      {t.topic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hoping for */}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">What are you hoping for?</label>
            <div className="flex flex-col gap-2">
              {HOPING_FOR.map((h) => (
                <button key={h.value} onClick={() => setEditHoping(h.value)}
                  className="w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all"
                  style={{
                    background: editHoping === h.value ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                    color: editHoping === h.value ? "var(--accent-primary)" : "var(--text-primary)",
                    border: `1px solid ${editHoping === h.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  }}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">LinkedIn URL</label>
            <input type="url" value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors" />
          </div>

          {/* Toggles */}
          <div className="rounded-xl p-4 space-y-4"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">LinkedIn visible to all</p>
                <p className="text-xs text-text-secondary mt-0.5">Off = only visible on mutual wave</p>
              </div>
              <Toggle checked={editLinkedinPublic} onChange={setEditLinkedinPublic} />
            </label>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ── View Mode ──
  const season = CURRENT_SEASONS.find((s) => s.value === profile.current_season);
  const hoping = HOPING_FOR.find((h) => h.value === profile.hoping_for);

  return (
    <div className="min-h-dvh pb-28">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="font-mono text-xl font-bold">My Profile</h1>
        <button onClick={startEditing}
          className="text-sm font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
          Edit
        </button>
      </div>

      <div className="px-4 space-y-3">
        {/* Hero */}
        <div className="rounded-2xl p-5 flex flex-col items-center text-center gap-3 animate-fade-up"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
          <Avatar name={profile.name} photo_url={profile.photo_url} size={88} />
          <div>
            <h2 className="font-semibold text-lg">{profile.name}</h2>
            {profile.work_one_liner && (
              <p className="text-text-secondary text-sm mt-1">{profile.work_one_liner}</p>
            )}
          </div>
        </div>

        {/* Season */}
        {season && (
          <div className="rounded-2xl p-4 flex flex-wrap gap-2 animate-fade-up"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", animationDelay: "50ms", animationFillMode: "both" }}>
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              {season.emoji} {season.label}
            </span>
          </div>
        )}

        {/* Looking for */}
        {hoping && (
          <div className="rounded-2xl p-4 animate-fade-up"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", animationDelay: "75ms", animationFillMode: "both" }}>
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>LOOKING FOR</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                {hoping.label}
              </span>
            </div>
          </div>
        )}

        {/* Discussion topics */}
        {profile.discussion_topics.length > 0 && (
          <div className="rounded-2xl p-4 animate-fade-up"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", animationDelay: "100ms", animationFillMode: "both" }}>
            <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>DISCUSSION TOPICS</p>
            <div className="flex flex-wrap gap-2">
              {profile.discussion_topics.map((topic) => (
                <span key={topic} className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="rounded-2xl p-4 animate-fade-up"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", animationDelay: "150ms", animationFillMode: "both" }}>
          <p className="font-mono text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>SETTINGS</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm">LinkedIn visibility</span>
              <span className="text-xs font-mono" style={{ color: profile.linkedin_public ? "var(--accent-success)" : "var(--text-secondary)" }}>
                {profile.linkedin_public ? "PUBLIC" : "MUTUAL ONLY"}
              </span>
            </div>
            {profile.linkedin_url && (
              <div className="flex items-center justify-between">
                <span className="text-sm">LinkedIn</span>
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-mono truncate max-w-[180px]" style={{ color: "var(--accent-primary)" }}>
                  Link →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 animate-fade-up"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", animationDelay: "200ms", animationFillMode: "both" }}>
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

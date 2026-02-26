"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TAG_COLORS, INTEREST_TAGS, LOOKING_FOR } from "@/lib/constants";
import { TOTEMS, PIXEL_COLORS } from "@/lib/totems";
import BottomNav from "@/components/BottomNav";
import imageCompression from "browser-image-compression";

interface MyProfile {
  id: string;
  name: string;
  role: string;
  claude_title: string | null;
  claude_title_regenerations: number;
  tags: string[];
  looking_for: string[];
  photo_url: string | null;
  primary_tag: string | null;
  cool_thing: string | null;
  mcp_servers_skills: string | null;
  claude_md_snippet: string | null;
  linkedin_url: string | null;
  share_email: boolean;
  discoverable: boolean;
  beacon_totem: string | null;
  beacon_color: string | null;
}

function Avatar({
  name,
  photo_url,
  primary_tag,
  size = 80,
}: {
  name: string;
  photo_url: string | null;
  primary_tag: string | null;
  size?: number;
}) {
  const color = primary_tag ? TAG_COLORS[primary_tag] : null;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

function MiniTotem({
  gridData,
  color,
  size,
}: {
  gridData: string[];
  color: string;
  size: number;
}) {
  const cols = gridData[0].length;
  const rows = gridData.length;
  const cell = Math.floor(size / Math.max(rows, cols));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${rows}, ${cell}px)`,
        gap: "1px",
      }}
    >
      {gridData.flatMap((row, r) =>
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
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{
        background: checked ? "var(--accent-primary)" : "var(--bg-primary)",
      }}
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editLookingFor, setEditLookingFor] = useState<string[]>([]);
  const [editCoolThing, setEditCoolThing] = useState("");
  const [editMcp, setEditMcp] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editShareEmail, setEditShareEmail] = useState(false);
  const [editDiscoverable, setEditDiscoverable] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!data) {
        router.push("/onboarding");
        return;
      }
      setProfile(data as MyProfile);
      setLoading(false);
    });
  }, [router]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditRole(profile.role);
    setEditTags([...profile.tags]);
    setEditLookingFor([...profile.looking_for]);
    setEditCoolThing(profile.cool_thing || "");
    setEditMcp(profile.mcp_servers_skills || "");
    setEditLinkedin(profile.linkedin_url || "");
    setEditShareEmail(profile.share_email);
    setEditDiscoverable(profile.discoverable);
    setPhotoPreview(null);
    setPhotoFile(null);
    setEditing(true);
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

  const toggleTag = (tag: string) => {
    setEditTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 5
          ? [...prev, tag]
          : prev
    );
  };

  const toggleLookingFor = (item: string) => {
    setEditLookingFor((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : prev.length < 3
          ? [...prev, item]
          : prev
    );
  };

  const handleSave = async () => {
    setSaving(true);

    let newPhotoUrl = profile?.photo_url || null;
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        newPhotoUrl = url;
      }
    }

    const body = {
      name: editName.trim(),
      role: editRole.trim().slice(0, 60),
      tags: editTags,
      looking_for: editLookingFor,
      primary_tag: editTags[0] ?? null,
      cool_thing: editCoolThing.trim().slice(0, 280) || null,
      mcp_servers_skills: editMcp.trim().slice(0, 500) || null,
      linkedin_url: editLinkedin.trim() || null,
      share_email: editShareEmail,
      discoverable: editDiscoverable,
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

  if (!profile) return null;

  const primaryColor = profile.primary_tag ? TAG_COLORS[profile.primary_tag] : null;
  const beaconTotem = profile.beacon_totem
    ? TOTEMS.find((t) => t.id === profile.beacon_totem)
    : null;
  const beaconColor =
    profile.beacon_color ||
    PIXEL_COLORS[0].hex;

  // ─── Edit Mode ───
  if (editing) {
    const canSave =
      editName.trim().length > 0 &&
      editRole.trim().length > 0 &&
      editTags.length >= 3 &&
      editLookingFor.length >= 1;

    return (
      <div className="min-h-dvh pb-28">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-text-secondary"
          >
            Cancel
          </button>
          <h1 className="font-mono text-lg font-bold">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="text-sm font-semibold disabled:opacity-40"
            style={{ color: "var(--accent-primary)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="px-4 space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl shrink-0 overflow-hidden transition-opacity hover:opacity-80"
              style={{
                background:
                  photoPreview || profile.photo_url
                    ? "transparent"
                    : "var(--bg-elevated)",
                border: `2px dashed ${photoPreview || profile.photo_url ? "transparent" : "var(--border-hover)"}`,
              }}
            >
              {photoPreview || profile.photo_url ? (
                <img
                  src={photoPreview || profile.photo_url!}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                "📷"
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-accent-primary text-sm font-medium"
            >
              Change photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* Name + Role */}
          <div className="space-y-3">
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                Role
              </label>
              <input
                type="text"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value.slice(0, 60))}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              />
              <p className="text-text-secondary text-xs mt-1 text-right">
                {editRole.length}/60
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              Interests ({editTags.length}/5)
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((tag) => {
                const active = editTags.includes(tag);
                const c = TAG_COLORS[tag];
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: active ? c.bg : "var(--bg-elevated)",
                      color: active ? c.text : "var(--text-secondary)",
                      border: `1px solid ${active ? c.bg : "var(--border-subtle)"}`,
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Looking for */}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              Looking for ({editLookingFor.length}/3)
            </label>
            <div className="flex flex-col gap-2">
              {LOOKING_FOR.map((item) => {
                const active = editLookingFor.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleLookingFor(item)}
                    className="w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all"
                    style={{
                      background: active
                        ? "rgba(220, 107, 47, 0.12)"
                        : "var(--bg-elevated)",
                      color: active
                        ? "var(--accent-primary)"
                        : "var(--text-primary)",
                      border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">
              Cool thing you&apos;ve built
            </label>
            <textarea
              value={editCoolThing}
              onChange={(e) => setEditCoolThing(e.target.value.slice(0, 280))}
              rows={2}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
            <p className="text-text-secondary text-xs mt-1 text-right">
              {editCoolThing.length}/280
            </p>
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">
              MCP servers / Claude tools
            </label>
            <input
              type="text"
              value={editMcp}
              onChange={(e) => setEditMcp(e.target.value.slice(0, 500))}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={editLinkedin}
              onChange={(e) => setEditLinkedin(e.target.value)}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          {/* Toggles */}
          <div
            className="rounded-xl p-4 space-y-4"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Share email on connection</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Only visible to mutual waves
                </p>
              </div>
              <Toggle
                checked={editShareEmail}
                onChange={setEditShareEmail}
              />
            </label>
            <div
              className="h-px"
              style={{ background: "var(--border-subtle)" }}
            />
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Appear in search</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Let others find you by name
                </p>
              </div>
              <Toggle
                checked={editDiscoverable}
                onChange={setEditDiscoverable}
              />
            </label>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ─── View Mode ───
  return (
    <div className="min-h-dvh pb-28">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="font-mono text-xl font-bold">
          <span style={{ color: "var(--accent-primary)" }}>My</span> Profile
        </h1>
        <button
          onClick={startEditing}
          className="text-sm font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          Edit
        </button>
      </div>

      <div className="px-4 space-y-3">
        {/* Hero card */}
        <div
          className="rounded-2xl p-5 flex flex-col items-center text-center gap-3 animate-fade-up"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Avatar
            name={profile.name}
            photo_url={profile.photo_url}
            primary_tag={profile.primary_tag}
            size={88}
          />
          <div>
            <h2 className="font-semibold text-lg">{profile.name}</h2>
            <p className="text-text-secondary text-sm">{profile.role}</p>
            {profile.claude_title && (
              <p
                className="font-mono text-sm mt-1"
                style={{ color: "var(--accent-primary)" }}
              >
                {profile.claude_title}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div
          className="rounded-2xl p-4 animate-fade-up"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            animationDelay: "50ms",
            animationFillMode: "both",
          }}
        >
          <p
            className="font-mono text-xs font-bold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            INTERESTS
          </p>
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

        {/* Looking for */}
        <div
          className="rounded-2xl p-4 animate-fade-up"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            animationDelay: "100ms",
            animationFillMode: "both",
          }}
        >
          <p
            className="font-mono text-xs font-bold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            LOOKING FOR
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.looking_for.map((item) => (
              <span
                key={item}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Cool thing */}
        {profile.cool_thing && (
          <div
            className="rounded-2xl p-4 animate-fade-up"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              animationDelay: "150ms",
              animationFillMode: "both",
            }}
          >
            <p
              className="font-mono text-xs font-bold mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              COOL THING I BUILT
            </p>
            <p className="text-sm leading-relaxed">{profile.cool_thing}</p>
          </div>
        )}

        {/* MCP servers */}
        {profile.mcp_servers_skills && (
          <div
            className="rounded-2xl p-4 animate-fade-up"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              animationDelay: "200ms",
              animationFillMode: "both",
            }}
          >
            <p
              className="font-mono text-xs font-bold mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              MCP SERVERS & TOOLS
            </p>
            <p className="text-sm font-mono leading-relaxed text-text-secondary">
              {profile.mcp_servers_skills}
            </p>
          </div>
        )}

        {/* Beacon totem */}
        {beaconTotem && (
          <div
            className="rounded-2xl p-4 animate-fade-up"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              animationDelay: "250ms",
              animationFillMode: "both",
            }}
          >
            <p
              className="font-mono text-xs font-bold mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              BEACON TOTEM
            </p>
            <div className="flex items-center gap-4">
              <div
                className="rounded-xl p-2"
                style={{ background: "var(--bg-primary)" }}
              >
                <MiniTotem
                  gridData={beaconTotem.grid}
                  color={beaconColor}
                  size={48}
                />
              </div>
              <div>
                <p className="font-mono text-sm font-bold">{beaconTotem.name}</p>
                <p className="text-text-secondary text-xs mt-0.5">
                  Your pixel identity
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings summary */}
        <div
          className="rounded-2xl p-4 animate-fade-up"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            animationDelay: "300ms",
            animationFillMode: "both",
          }}
        >
          <p
            className="font-mono text-xs font-bold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            SETTINGS
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm">Share email on connection</span>
              <span
                className="text-xs font-mono"
                style={{
                  color: profile.share_email
                    ? "var(--accent-success)"
                    : "var(--text-secondary)",
                }}
              >
                {profile.share_email ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Appear in search</span>
              <span
                className="text-xs font-mono"
                style={{
                  color: profile.discoverable
                    ? "var(--accent-success)"
                    : "var(--text-secondary)",
                }}
              >
                {profile.discoverable ? "ON" : "OFF"}
              </span>
            </div>
            {profile.linkedin_url && (
              <div className="flex items-center justify-between">
                <span className="text-sm">LinkedIn</span>
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono truncate max-w-[180px]"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Linked →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 animate-fade-up"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            animationDelay: "350ms",
            animationFillMode: "both",
          }}
        >
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

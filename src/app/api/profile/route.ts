import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    work_one_liner,
    current_season,
    discussion_topics,
    hoping_for,
    linkedin_url,
    linkedin_public,
    share_email,
    meetup_id,
    photo_url,
  } = body;

  if (!name?.trim() || !current_season || !hoping_for || !meetup_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      meetup_id,
      name: name.trim(),
      work_one_liner: work_one_liner?.trim().slice(0, 80) || null,
      current_season,
      discussion_topics: discussion_topics || [],
      hoping_for,
      linkedin_url: linkedin_url?.trim() || null,
      linkedin_public: linkedin_public ?? false,
      share_email: share_email ?? false,
      photo_url: photo_url || null,
      checked_in: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Whitelist allowed fields to prevent mass assignment
  const ALLOWED_FIELDS = [
    "name",
    "work_one_liner",
    "current_season",
    "discussion_topics",
    "hoping_for",
    "linkedin_url",
    "linkedin_public",
    "share_email",
    "photo_url",
    "meetup_id",
    "checked_in",
  ] as const;

  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      sanitized[key] = body[key];
    }
  }

  // Users can only set checked_in to false (reset), not true (that's admin-only)
  if (sanitized.checked_in === true) {
    delete sanitized.checked_in;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ...sanitized, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

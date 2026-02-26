import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST — Send an "on my way" ping to a live beacon user */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to_user } = await request.json();

  if (!to_user || to_user === user.id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  // Verify target user has beacon active
  const { data: target } = await supabase
    .from("profiles")
    .select("is_beacon_active")
    .eq("id", to_user)
    .single();

  if (!target?.is_beacon_active) {
    return NextResponse.json(
      { error: "User is not currently live" },
      { status: 400 }
    );
  }

  // Rate limit: one ping per sender→receiver per 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("beacon_pings")
    .select("id")
    .eq("from_user", user.id)
    .eq("to_user", to_user)
    .gte("created_at", fiveMinAgo)
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: "Already pinged recently" },
      { status: 429 }
    );
  }

  const { error } = await supabase.from("beacon_pings").insert({
    from_user: user.id,
    to_user,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** GET — Get pings for the current user's active beacon session */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  let query = supabase
    .from("beacon_pings")
    .select(
      `
      id,
      created_at,
      from_user,
      profiles!beacon_pings_from_user_fkey (
        id,
        name,
        photo_url,
        primary_tag
      )
    `
    )
    .eq("to_user", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (since) {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pings: data || [] });
}

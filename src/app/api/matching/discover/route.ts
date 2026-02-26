import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");
  const tagFilter = searchParams.get("tag");
  const search = searchParams.get("search")?.toLowerCase().trim();

  // Fetch matches where current user is user_a or user_b
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      score,
      match_reason,
      conversation_starter,
      user_a,
      user_b
    `)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id})`)
    .order("score", { ascending: false });

  if (!matches || matches.length === 0) {
    return NextResponse.json({ profiles: [], total: 0 });
  }

  // Get the other user's ID for each match
  const otherUserIds = matches.map((m) =>
    m.user_a === user.id ? m.user_b : m.user_a
  );

  // Fetch those profiles
  let profileQuery = supabase
    .from("profiles")
    .select("id, name, role, tags, looking_for, claude_title, photo_url, primary_tag, is_beacon_active, beacon_totem, beacon_color")
    .in("id", otherUserIds);

  if (tagFilter) {
    profileQuery = profileQuery.contains("tags", [tagFilter]);
  }

  if (search) {
    profileQuery = profileQuery
      .eq("discoverable", true)
      .ilike("name", `%${search}%`);
  }

  const { data: profiles } = await profileQuery;

  if (!profiles) {
    return NextResponse.json({ profiles: [], total: 0 });
  }

  // Merge match data back onto profiles, sort by score
  const matchMap = new Map(
    matches.map((m) => [
      m.user_a === user.id ? m.user_b : m.user_a,
      { score: m.score, match_reason: m.match_reason, conversation_starter: m.conversation_starter },
    ])
  );

  const enriched = profiles
    .map((p) => ({ ...p, ...(matchMap.get(p.id) || { score: 0, match_reason: "", conversation_starter: "" }) }))
    .sort((a, b) => b.score - a.score);

  const total = enriched.length;
  const paginated = enriched.slice(offset, offset + limit);

  return NextResponse.json({ profiles: paginated, total });
}

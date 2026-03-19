import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current user's profile to find meetup + check-in status
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("meetup_id, checked_in")
    .eq("id", user.id)
    .maybeSingle();

  if (!myProfile?.meetup_id) {
    return NextResponse.json({ profiles: [], total: 0, checkedIn: false });
  }

  if (!myProfile.checked_in) {
    return NextResponse.json({ profiles: [], total: 0, checkedIn: false });
  }

  const { searchParams } = new URL(request.url);
  const topicFilter = searchParams.get("topic");
  const search = searchParams.get("search")?.toLowerCase().trim();
  const mode = searchParams.get("mode") || "matched"; // "matched" or "all"

  // MODE: "all" — Browse all checked-in attendees
  if (mode === "all") {
    let profileQuery = supabase
      .from("profiles")
      .select("id, name, work_one_liner, current_season, discussion_topics, hoping_for, photo_url, linkedin_url, linkedin_public")
      .eq("meetup_id", myProfile.meetup_id)
      .eq("checked_in", true)
      .neq("id", user.id); // Exclude self

    if (search) {
      profileQuery = profileQuery.ilike("name", `%${search}%`);
    }

    const { data: profiles } = await profileQuery;

    if (!profiles) {
      return NextResponse.json({ profiles: [], total: 0, checkedIn: true, mode: "all" });
    }

    // Apply topic filter
    let filtered = profiles;
    if (topicFilter) {
      filtered = profiles.filter((p) =>
        Array.isArray(p.discussion_topics) && p.discussion_topics.includes(topicFilter)
      );
    }

    // Add default empty match fields and sort alphabetically
    const enriched = filtered
      .map((p) => ({
        ...p,
        score: 0,
        match_reason: "",
        conversation_starter: "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ profiles: enriched, total: enriched.length, checkedIn: true, mode: "all" });
  }

  // MODE: "matched" — Show AI-matched profiles only (default behavior)
  // Fetch matches for this user within this meetup
  const { data: matches } = await supabase
    .from("matches")
    .select("score, match_reason, conversation_starter, user_a, user_b")
    .eq("meetup_id", myProfile.meetup_id)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("score", { ascending: false });

  if (!matches || matches.length === 0) {
    return NextResponse.json({ profiles: [], total: 0, checkedIn: true, mode: "matched" });
  }

  // Get the partner user IDs
  const otherUserIds = matches.map((m) =>
    m.user_a === user.id ? m.user_b : m.user_a
  );

  // Fetch those profiles (checked-in only, same meetup)
  let profileQuery = supabase
    .from("profiles")
    .select("id, name, work_one_liner, current_season, discussion_topics, hoping_for, photo_url, linkedin_url, linkedin_public")
    .in("id", otherUserIds)
    .eq("meetup_id", myProfile.meetup_id)
    .eq("checked_in", true);

  if (search) {
    profileQuery = profileQuery.ilike("name", `%${search}%`);
  }

  const { data: profiles } = await profileQuery;

  if (!profiles) {
    return NextResponse.json({ profiles: [], total: 0, checkedIn: true, mode: "matched" });
  }

  // Build match map
  const matchMap = new Map(
    matches.map((m) => [
      m.user_a === user.id ? m.user_b : m.user_a,
      { score: m.score, match_reason: m.match_reason, conversation_starter: m.conversation_starter },
    ])
  );

  // Enrich and sort by score
  let enriched = profiles
    .map((p) => ({
      ...p,
      ...(matchMap.get(p.id) || { score: 0, match_reason: "", conversation_starter: "" }),
    }))
    .sort((a, b) => b.score - a.score);

  // Apply topic filter client-friendly (filter by topic in discussion_topics array)
  if (topicFilter) {
    enriched = enriched.filter((p) =>
      Array.isArray(p.discussion_topics) && p.discussion_topics.includes(topicFilter)
    );
  }

  return NextResponse.json({ profiles: enriched, total: enriched.length, checkedIn: true, mode: "matched" });
}

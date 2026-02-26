import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — Fetch all currently live beacon users */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, role, claude_title, photo_url, primary_tag, beacon_totem, beacon_color, beacon_bg, beacon_activated_at"
    )
    .eq("is_beacon_active", true)
    .neq("id", user.id)
    .order("beacon_activated_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ beacons: data || [] });
}

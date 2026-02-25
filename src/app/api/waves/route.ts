import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
  }

  // Send wave
  const { error: waveError } = await supabase.from("waves").insert({
    from_user: user.id,
    to_user,
  });

  if (waveError) {
    if (waveError.code === "23505") {
      return NextResponse.json({ error: "Already waved" }, { status: 409 });
    }
    return NextResponse.json({ error: waveError.message }, { status: 500 });
  }

  // Check for mutual wave
  const { data: mutualWave } = await supabase
    .from("waves")
    .select("id")
    .eq("from_user", to_user)
    .eq("to_user", user.id)
    .single();

  if (mutualWave) {
    // Create connection (order user IDs consistently)
    const [userA, userB] =
      user.id < to_user ? [user.id, to_user] : [to_user, user.id];

    await supabase.from("connections").insert({
      user_a: userA,
      user_b: userB,
    });

    return NextResponse.json({ mutual: true });
  }

  return NextResponse.json({ mutual: false });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "received";

  if (type === "sent") {
    const { data } = await supabase
      .from("waves")
      .select("*, to_user_profile:profiles!waves_to_user_fkey(*)")
      .eq("from_user", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json(data);
  }

  // Default: received
  const { data } = await supabase
    .from("waves")
    .select("*, from_user_profile:profiles!waves_from_user_fkey(*)")
    .eq("to_user", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data);
}

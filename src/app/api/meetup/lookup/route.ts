import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Use service role to bypass RLS for invite code lookup
const supabaseAdmin = createAdminClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const { data: meetup, error } = await supabaseAdmin
    .from("meetups")
    .select("id, name")
    .eq("invite_code", code)
    .single();

  if (error || !meetup) {
    return NextResponse.json({ meetup: null });
  }

  return NextResponse.json({ meetup });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateClaudeTitle } from "@/lib/claude";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check regeneration limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("claude_title_regenerations, tags, role, looking_for, claude_md_snippet, cool_thing, mcp_servers_skills")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.claude_title_regenerations >= 3) {
    return NextResponse.json(
      { error: "Maximum regenerations reached" },
      { status: 429 }
    );
  }

  const title = await generateClaudeTitle({
    role: profile.role,
    tags: profile.tags,
    looking_for: profile.looking_for,
    claude_md_snippet: profile.claude_md_snippet,
    cool_thing: profile.cool_thing,
    mcp_servers_skills: profile.mcp_servers_skills,
  });

  // Update profile with new title
  await supabase
    .from("profiles")
    .update({
      claude_title: title,
      claude_title_regenerations: profile.claude_title_regenerations + 1,
    })
    .eq("id", user.id);

  return NextResponse.json({ claude_title: title });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RawProfile = {
  id: string;
  name: string;
  work_one_liner: string | null;
  discussion_topics: string[];
  photo_url: string | null;
  linkedin_url: string | null;
  share_email: boolean;
  email: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: connections, error } = await supabase
    .from("connections")
    .select(
      `id, created_at,
       profile_a:profiles!connections_user_a_fkey(id, name, work_one_liner, discussion_topics, photo_url, linkedin_url, share_email, email),
       profile_b:profiles!connections_user_b_fkey(id, name, work_one_liner, discussion_topics, photo_url, linkedin_url, share_email, email)`
    )
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error || !connections) {
    return NextResponse.json([]);
  }

  const result = (
    connections as unknown as Array<{
      id: string;
      created_at: string;
      profile_a: RawProfile;
      profile_b: RawProfile;
    }>
  ).map((c) => {
    const other = c.profile_a.id === user.id ? c.profile_b : c.profile_a;
    return {
      id: c.id,
      connected_at: c.created_at,
      other: {
        ...other,
        email: other.share_email ? other.email : null,
      },
    };
  });

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const [
    { count: totalUsers },
    { count: totalConnections },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("connections").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    total_users: totalUsers || 0,
    total_connections: totalConnections || 0,
  });
}

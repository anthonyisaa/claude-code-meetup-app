import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Weekly cron job to keep the Supabase free tier project from pausing.
// Triggered by Vercel Cron every Monday at 9am UTC.
// See vercel.json for the schedule.
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (not a random visitor)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Lightweight query — just checks the DB is alive
  const { error } = await supabase.from("meetups").select("id").limit(1);

  if (error) {
    console.error("Ping failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  console.log("Supabase ping successful:", new Date().toISOString());
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}

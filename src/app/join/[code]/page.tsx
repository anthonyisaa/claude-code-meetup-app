"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [status, setStatus] = useState<"loading" | "found" | "not_found">("loading");
  const [meetupName, setMeetupName] = useState("");

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      // Look up the meetup by invite code (uses API to bypass RLS for unauthenticated users)
      const res = await fetch(`/api/meetup/lookup?code=${encodeURIComponent(code)}`);
      const { meetup } = await res.json();

      if (!meetup) {
        setStatus("not_found");
        return;
      }

      setMeetupName(meetup.name);
      setStatus("found");

      // Store meetup context in localStorage so onboarding can read it
      localStorage.setItem("gw_meetup_id", meetup.id);
      localStorage.setItem("gw_meetup_name", meetup.name);

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if they already have a profile for this meetup
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, meetup_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.meetup_id === meetup.id) {
          // Already registered for this exact meetup
          router.push("/discover");
        } else if (profile) {
          // Has a profile from a previous meetup → short re-onboarding (topics + hoping for only)
          router.push("/onboarding?returning=true");
        } else {
          // Brand new user → full onboarding
          router.push("/onboarding");
        }
      } else {
        // Not logged in → go to login, then onboarding
        router.push("/auth/login");
      }
    };

    init();
  }, [code, router]);

  if (status === "not_found") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-4">🔗</p>
        <h1 className="font-mono text-xl font-bold mb-2">Invalid invite link</h1>
        <p className="text-text-secondary text-sm">
          This link doesn&apos;t match any meetup. Check with your host for the correct link.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl mb-4">🌍</p>
      <h1 className="font-mono text-xl font-bold mb-2">
        {status === "loading" ? "Loading..." : `Welcome to ${meetupName}`}
      </h1>
      <p className="text-text-secondary text-sm">Getting things ready...</p>
    </div>
  );
}

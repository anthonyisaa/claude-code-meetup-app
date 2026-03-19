"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Inner component that reads URL params — must be wrapped in <Suspense> per Next.js rules.
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handle = async () => {
      const supabase = createClient();
      const code = searchParams.get("code");

      const session = await (async () => {
        if (code) {
          // PKCE flow (magic link, Google OAuth)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            console.error("PKCE auth error:", error?.message);
            router.push("/auth/login?error=auth");
            return null;
          }
          return data.session;
        }

        // Implicit flow (legacy fallback) — parse hash tokens manually
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) {
          router.push("/auth/login?error=auth");
          return null;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !data.session) {
          console.error("Implicit auth error:", error?.message);
          router.push("/auth/login?error=auth");
          return null;
        }
        return data.session;
      })();

      if (!session) return;

      // If the user came from a specific page (e.g. /admin), send them back there
      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.push(next);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();

      router.push(profile ? "/discover" : "/onboarding");
    };

    handle();
  }, [searchParams, router]);

  return null;
}

export default function CallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-dvh">
      <p className="text-text-secondary text-sm">Signing you in…</p>
      <Suspense>
        <CallbackInner />
      </Suspense>
    </div>
  );
}

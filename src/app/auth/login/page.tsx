"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IS_DEV = process.env.NODE_ENV === "development";

const COOLDOWN_SECONDS = 60;
const LS_KEY = "otp_sent_at";

function getSavedCooldown(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return 0;
    const elapsed = Math.floor((Date.now() - Number(raw)) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - elapsed);
  } catch {
    return 0;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Restore cooldown from localStorage on mount so page refreshes don't reset it
  useEffect(() => {
    const remaining = getSavedCooldown();
    if (remaining > 0) {
      setSent(true);
      setCooldown(remaining);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem(LS_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable — cooldown won't persist across refreshes
    }

    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
    setLoading(false);
  };

  const handleDevLogin = async () => {
    if (!email) {
      setError("Enter an email first");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Dev login failed");
      setLoading(false);
      return;
    }
    // Navigate to the generated magic link URL — no email required
    router.push(json.url);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="font-mono text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-text-secondary mb-6">
          We sent a magic link to <span className="text-text-primary font-medium">{email}</span>
        </p>
        {cooldown > 0 ? (
          <p className="text-text-secondary text-sm">
            Resend available in {cooldown}s
          </p>
        ) : (
          <button
            onClick={() => setSent(false)}
            className="text-text-secondary text-sm underline underline-offset-4 hover:text-text-primary transition-colors"
          >
            Use a different email
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6">
      <h1 className="font-mono text-3xl font-bold mb-2 text-center">
        Join <span className="text-accent-primary">Claude Connect</span>
      </h1>
      <p className="text-text-secondary text-center mb-8">
        Enter your email to get started
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
        />
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-accent-primary text-white font-semibold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:scale-100"
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
        {IS_DEV && (
          <button
            type="button"
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full py-3 font-semibold rounded-xl border transition-colors disabled:opacity-50"
            style={{
              background: "rgba(234,179,8,0.1)",
              borderColor: "rgba(234,179,8,0.4)",
              color: "rgb(234,179,8)",
            }}
          >
            Dev Login (skip email)
          </button>
        )}
      </form>
    </div>
  );
}

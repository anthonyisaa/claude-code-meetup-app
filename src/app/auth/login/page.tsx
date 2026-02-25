"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="font-mono text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-text-secondary mb-6">
          We sent a magic link to <span className="text-text-primary font-medium">{email}</span>
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-text-secondary text-sm underline underline-offset-4 hover:text-text-primary transition-colors"
        >
          Use a different email
        </button>
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
      </form>
    </div>
  );
}

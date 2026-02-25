import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      {/* Glow effect behind title */}
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl opacity-30 bg-accent-primary rounded-full scale-150" />
        <h1 className="relative font-mono text-5xl font-extrabold tracking-tight">
          <span className="text-accent-primary">Claude</span>
          <br />
          <span className="text-text-primary">Connect</span>
        </h1>
      </div>

      <p className="text-text-secondary text-lg mb-2">
        Claude Code Meetup Singapore
      </p>

      <p className="text-text-secondary text-sm mb-10 max-w-[300px]">
        Find your people. AI-powered matching for meaningful connections at the
        meetup.
      </p>

      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center px-8 py-4 bg-accent-primary text-white font-semibold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[var(--glow-orange)]"
      >
        Join Claude Connect
      </Link>

      <div className="mt-16 flex items-center gap-6 text-text-secondary text-sm">
        <div className="text-center">
          <div className="font-mono text-2xl font-bold text-text-primary">
            800
          </div>
          <div>Attendees</div>
        </div>
        <div className="w-px h-8 bg-border-subtle" />
        <div className="text-center">
          <div className="font-mono text-2xl font-bold text-accent-success">
            0
          </div>
          <div>Connected</div>
        </div>
      </div>
    </div>
  );
}

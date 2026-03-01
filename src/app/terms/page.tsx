export const metadata = {
  title: "Terms of Service — Claude Connect",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-white text-gray-800" style={{ lineHeight: 1.7 }}>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-1 text-gray-900">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: March 1, 2026</p>

        <p className="mb-6">
          Claude Connect (&ldquo;the App&rdquo;) is a free, open-source hobby project built to help
          attendees of the Claude Code Meetup Singapore connect with each other. It is not
          affiliated with Anthropic. By using the App, you agree to these terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">What the App is</h2>
        <p className="mb-4">
          This is a personal project, not a commercial service. It is provided free of charge,
          as-is, with no guarantees of availability, uptime, or continued maintenance.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Your account</h2>
        <p className="mb-4">
          You can sign in using Google, GitHub, or a magic link sent to your email. You are
          responsible for your account and any activity that occurs through it. You may request
          account deletion at any time by contacting us.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Acceptable use</h2>
        <p className="mb-4">
          Please use the App respectfully. Do not use it to harass others, post harmful or illegal
          content, spam, or attempt to disrupt the service. We reserve the right to remove accounts
          that violate these guidelines.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Your content</h2>
        <p className="mb-4">
          Any content you post through the App remains yours. By posting it, you grant us permission
          to display it within the App as part of normal operation. We will not use your content for
          any other purpose.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">AI-powered features</h2>
        <p className="mb-4">
          The App uses Anthropic&rsquo;s Claude API to generate profile titles and match scores.
          Parts of your profile data (such as your role, interest tags, and project descriptions)
          are sent to Anthropic for processing. By using the App, you consent to this processing.
          For details, see our{" "}
          <a href="/privacy" className="text-blue-600 underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Third-party services</h2>
        <p className="mb-4">
          The App relies on third-party services including Supabase, Vercel, Anthropic, Google, and
          GitHub. Your use of the App is also subject to the terms and policies of these providers.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Interactions with other users</h2>
        <p className="mb-4">
          The App facilitates connections between users. You are solely responsible for your
          interactions with other users and for any information you choose to share with them,
          including your email address or other personal details. We are not responsible for the
          conduct of any user, and we take no liability for any connections, communications, or
          relationships formed through the App. Use your own judgement when sharing personal
          information with others.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">No warranty</h2>
        <p className="mb-4">
          The App is provided &ldquo;as is&rdquo; without warranty of any kind. We are not liable
          for any damages arising from your use of the App, including any harm resulting from
          interactions with other users. This is a hobby project and may go offline, change, or shut
          down at any time without notice.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Changes</h2>
        <p className="mb-4">
          We may update these terms from time to time. Continued use of the App after changes
          constitutes acceptance of the new terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Contact</h2>
        <p className="mb-4">
          If you have questions, please reach out through the{" "}
          <a
            href="https://github.com/anthonyisaa/Claude_Code_Meetup/issues"
            className="text-blue-600 underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub repository
          </a>
          .
        </p>
      </div>
    </div>
  );
}

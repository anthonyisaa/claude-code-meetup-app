export const metadata = {
  title: "Privacy Policy — Claude Connect",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-white text-gray-800" style={{ lineHeight: 1.7 }}>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-1 text-gray-900">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: March 1, 2026</p>

        <p className="mb-6">
          Claude Connect (&ldquo;the App&rdquo;) is a personal, open-source hobby project built to
          help attendees of the Claude Code Meetup Singapore connect with each other. It is not
          affiliated with Anthropic. This privacy policy explains how we handle your information.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">What we collect</h2>
        <p className="mb-4">
          <strong>Authentication data:</strong> When you sign in using Google, GitHub, or a magic
          link, we receive your name, email address, and profile picture (where available) from the
          provider you choose. If you sign in via magic link, we collect only the email address you
          provide.
        </p>
        <p className="mb-4">
          <strong>Profile data you provide:</strong> During onboarding you may provide your name,
          job title/role, interest tags, what you&rsquo;re looking for, a description of something
          you&rsquo;ve built, an AI profile snippet, your LinkedIn URL, and an optional profile
          photo. You also control whether your email is shared with mutual connections and whether
          your name is searchable.
        </p>
        <p className="mb-4">
          <strong>Interaction data:</strong> The App records waves (interest signals) you send to
          other users, mutual connections formed, and beacon presence signals you choose to activate.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">How we use your information</h2>
        <p className="mb-4">
          Your information is used only to operate the App &mdash; specifically to let you sign in,
          build your profile, discover and connect with other attendees, and participate in live
          beacon features. We do not sell, rent, share, or trade your personal data for advertising,
          analytics, or any commercial purpose.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">AI-powered matching</h2>
        <p className="mb-4">
          To suggest relevant connections, parts of your profile (role, interest tags, what
          you&rsquo;re looking for, and optionally your AI profile snippet and project description)
          are sent to the Anthropic API (Claude) for match scoring and title generation. This data
          is processed in accordance with{" "}
          <a
            href="https://www.anthropic.com/privacy"
            className="text-blue-600 underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Anthropic&rsquo;s privacy policy
          </a>
          . No authentication credentials or contact details (email, LinkedIn) are sent to
          Anthropic.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Data storage</h2>
        <p className="mb-4">
          Your data is stored in Supabase (hosted in the ap-southeast-1 / Singapore region).
          Profile photos are stored in Supabase Storage. We take reasonable steps to keep your
          information secure, but as this is a hobby project maintained by one person, we cannot
          guarantee enterprise-grade security.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Third-party services</h2>
        <p className="mb-4">
          The App uses the following third-party services:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li>
            <strong>Google &amp; GitHub</strong> for authentication &mdash; their respective privacy
            policies apply during sign-in
          </li>
          <li>
            <strong>Supabase</strong> for database, authentication infrastructure, and file storage
          </li>
          <li>
            <strong>Anthropic (Claude)</strong> for AI-powered match scoring and title generation
          </li>
          <li>
            <strong>Vercel</strong> for hosting
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Information you share with others</h2>
        <p className="mb-4">
          The App is designed to help people connect. Your name, role, interest tags, and Claude
          title are visible to other signed-in users. Your email is only shared with mutual
          connections if you opt in. If you choose to share personal information with other users
          through the App, you do so at your own risk. We are not responsible for how other users
          may use information you share with them.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Open source</h2>
        <p className="mb-4">
          The source code for this App is publicly available on GitHub. No user data is included in
          the repository.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Data deletion</h2>
        <p className="mb-4">
          If you&rsquo;d like your account and associated data deleted, please contact us and we
          will remove it promptly.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Changes</h2>
        <p className="mb-4">
          We may update this policy from time to time. Any changes will be reflected on this page
          with an updated date.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900">Contact</h2>
        <p className="mb-4">
          If you have questions about this privacy policy, please reach out to us through the{" "}
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

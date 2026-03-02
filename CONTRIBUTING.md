# Contributing to Claude Connect

Thanks for your interest in contributing! Whether you're fixing a bug, adding a feature, or forking this for your own meetup, here's how to get started.

## Getting Started

1. **Fork the repo** and clone your fork locally
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your own Supabase and Anthropic API keys (see the README for details).

4. **Set up Supabase:**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` against your database
   - Set up the database tables described in `ARCHITECTURE.md`

5. **Run the dev server:**
   ```bash
   npm run dev
   ```

## Making Changes

- Create a feature branch from `main`
- Keep changes focused — one feature or fix per PR
- Follow the existing code style (TypeScript, Tailwind, App Router patterns)
- Test your changes locally before submitting

## Pull Requests

1. Push your branch to your fork
2. Open a PR against `main`
3. Describe what your change does and why
4. Link any related issues

## Forking for Your Own Meetup

This project is designed to be forked! To adapt it for your own event:

1. Fork the repo
2. Update the branding (name, colors, copy) in `src/app/globals.css` and layout files
3. Set up your own Supabase project and Anthropic API key
4. Update the privacy policy and terms of service pages
5. Deploy to Vercel (or your preferred host)

See the README and `ARCHITECTURE.md` for the full architecture and design decisions.

## Code of Conduct

Be kind and respectful. This is a community project — treat others the way you'd want to be treated.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

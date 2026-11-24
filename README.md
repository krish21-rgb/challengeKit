# challengeKit

Learning is better when it’s a challenge.

## Current scope

Phase 2 adds teacher registration, email/password sign-in, a protected teacher workspace, sign-out, and profile editing backed by Supabase Auth and PostgreSQL. The landing-page quiz card is illustrative. Quiz creation, student joining, live games, and reports are **not implemented** yet; there are no sample dashboard statistics.

## Local development

Requirements: Node.js 20.9 or newer (Node 22 LTS recommended), npm, and a Supabase project for authentication.

```bash
npm ci
cp .env.example .env.local
# Fill in .env.local using the steps below.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase configuration the landing page still works, but login and registration report that authentication is not configured. The development server binds to all interfaces for preview environments.

## Supabase setup

1. Create a Supabase project. This migration assumes a new project without an existing `public.profiles` table; review it before applying to an existing database.
2. In the Supabase SQL Editor, run `supabase/migrations/20261124000000_profiles.sql` once. Alternatively, use the Supabase CLI's migration workflow (`supabase link` and `supabase db push`). The migration creates the profile table, a new-user trigger, and RLS policies. It does not backfill profiles for existing users.
3. In the Supabase project settings, find the Project URL and **publishable key** (or legacy `anon` key). Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. These are public client keys protected by RLS. **Never put a service-role or secret key in a `NEXT_PUBLIC_` variable.**
4. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. This is the exact site origin, with no path. Use an HTTPS origin for deployed environments.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to your site origin and add the exact callback URL, e.g. `http://localhost:3000/auth/callback`, to the Redirect URLs allowlist. For production, add `https://your-domain/auth/callback` and use the production domain as the Site URL. Allowlist the exact preview callback separately if testing previews.
6. Enable email/password sign-in and email confirmation in Authentication settings. Register and open the confirmation link in the **same browser** where you started registration, because the PKCE verifier is stored there. If you open it elsewhere, sign in after confirming or retry registration in the original browser. Supabase's default email service has limits and is for testing; configure custom SMTP before production.
7. Restart the development server after changing environment variables. Test with a new account after applying the migration.

The database trigger assigns `teacher` regardless of user-supplied metadata. RLS lets a signed-in user read only their own profile and update only their display name; role changes require a trusted administrative workflow. The app verifies the user and role on the server for each protected page and action. The profile migration is not a substitute for future quiz/game RLS policies.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

With Supabase configured, manually test:

1. Open `/dashboard` signed out; you should be redirected to login. Open `/register`, create a teacher account, and confirm the email in the same browser.
2. Sign in, check the dashboard, edit your display name in Settings, refresh, and confirm that it persists. Sign out and verify the protected pages redirect to login again.
3. Test invalid inputs, incorrect credentials, keyboard navigation, and narrow screens. Try a second teacher account and confirm it cannot read or edit the first account’s profile through the Supabase API. Confirm an authenticated client cannot update its own `role` column.
4. The quiz preview remains non-interactive; quiz creation and multiplayer have not been implemented.

## GitHub and deployment

Commit and push on your working branch, then open a pull request when ready:

```bash
git status
git add .
git commit -m "Add teacher authentication"
git push -u origin "$(git branch --show-current)"
```

Import the repository into Vercel, select the **Next.js** framework, leave the root directory at the repository root, and disable custom build/output overrides. Deploy the intended branch. In Vercel project settings, set the same three variables from `.env.example` for each target environment. `NEXT_PUBLIC_SITE_URL` must be the exact public origin for that environment; configure Supabase redirect URLs accordingly. Redeploy after changing variables. Preview deployments need their own reachable origin and allowlisted callback if testing signup; use a stable preview domain or update the variable and allowlist for that deployment. Do not use a localhost URL for production. Set the Supabase production Site URL and callback allowlist to your real domain and configure SMTP before inviting users.

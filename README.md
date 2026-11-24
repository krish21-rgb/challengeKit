# challengeKit

Learning is better when it’s a challenge.

## Phase 1

This repository contains the responsive challengeKit landing page and a Next.js App Router foundation. The quiz card is a non-interactive illustration. Accounts, quiz creation, game sessions, Supabase, and reports are **not implemented yet**. No database or environment variables are needed for this phase.

## Local development

Requirements: Node.js 20.9 or newer (Node 22 LTS recommended) and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development server listens on all interfaces for preview environments. To verify the production build locally:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Manual checks

- Open the page at desktop and mobile widths. Check that the header, hero, feature cards, steps, call to action, and footer fit without horizontal scrolling.
- Follow each navigation and call-to-action link; each should lead to a section on the page. Use Tab to check keyboard focus.
- The quiz artwork is illustrative and cannot be played. No login or student-join flow is claimed to work in this phase.

## GitHub

On your working branch, inspect and commit your changes, then push that same branch:

```bash
git status
git add .
git commit -m "Build Phase 1 landing page"
git push -u origin "$(git branch --show-current)"
```

Create a pull request in GitHub when ready to merge.

## Deploy to Vercel

1. Push the repository to GitHub and import it as a new project in Vercel.
2. Select the repository and branch. Vercel detects Next.js automatically; use the default build command (`next build`) and install command.
3. No environment variables are required for Phase 1. Deploy and open the generated URL.
4. For production, attach a domain in Vercel and set the production branch according to your release workflow.

`.env.example` is intentionally empty of secrets. Supabase project setup, migrations, authentication redirect URLs, and production Supabase variables will be documented when the backend is implemented; configuring them now would imply functionality that does not yet exist.

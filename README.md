# Faculty Team App

Internal project management, time tracking, and billing tool for the studio.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine for 4 users).

2. **Run the migration.** In the Supabase dashboard, open the SQL editor and paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), then run it. This creates all
   tables, enums, indexes, the auto-profile trigger, and RLS policies.

3. **Set environment variables.** Copy `.env.local.example` to `.env.local` (already present with placeholder
   values — just replace them) and fill in from Supabase's Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (needed for the public client-share view — keep this secret, never expose it client-side)

4. **Create the 4 team accounts.** In Supabase Dashboard → Authentication → Users, add a user per teammate
   (email + password, or invite links). The `handle_new_user` trigger auto-creates a matching `profiles` row.
   Then in the Table Editor, open `profiles` and set each person's `hourly_rate` — this is the default rate used
   for time entries and billing (a project can override it via `hourly_rate_override`).

5. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## What's here

- **Clients & Projects** — `/clients`, `/projects`, with budgets (hours and/or $) and status tracking
- **Kanban board** — per-project task board with drag-and-drop, assignees, due dates, comments
- **Time tracking** — `/time`, live timer (one running per person) or manual entry, billable toggle
- **Dashboard** — `/` — hours logged this week per person, active timers, budget-vs-actual for active projects
- **Billing export** — `/billing` — filter by client/project/date range, export CSV, "mark as invoiced" locks
  those entries so they can't be edited later
- **Client share view** — `/share/[token]` (linked from a project's Details tab) — read-only, no login required

Deliberately out of scope for v1: retainer/rolling-hour tracking, project templates, built-in invoicing (CSV
export is meant to feed into your existing invoicing tool), capacity planning, and notifications. See
`supabase/migrations/0001_init.sql` and the app code for the current data model if you want to extend it.

## Deploying

Push this repo to GitHub and import it on [Vercel](https://vercel.com/new), setting the same three env vars
in the Vercel project settings. Supabase stays hosted on Supabase Cloud.

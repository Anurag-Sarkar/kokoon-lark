# Kokoon Task

A task management app built around **ownership**. Every task has a deadline and owners. Every deadline change needs a reason. Everyone sees the same honest picture of who is on track, who is slipping, and who has gone quiet.

Stack: **Next.js 16** (App Router, Server Actions) · **React 19** · **MongoDB + Mongoose** · Tailwind CSS 4 · Recharts.

## Run it

Requirements: Node 20+ and a MongoDB instance (local `mongod`, Docker, or Atlas).

```bash
npm install
cp .env.example .env.local        # edit MONGODB_URI if MongoDB isn't on localhost:27017
npm run seed                      # creates 6 demo people in 2 teams with 8 weeks of history (wipes existing data)
npm run dev                       # http://localhost:3000
```

Demo logins after seeding:

| Role   | Email              | Password      |
|--------|--------------------|---------------|
| Admin  | admin@kokoon.ai    | admin123      |
| Member | priya@kokoon.ai    | password123   |
| Member | rohan@ / sara@ / dev@ / meera@kokoon.ai | password123 |

To start from a clean database instead of demo data, skip `npm run seed`: with no accounts in the database the login page offers **Set up workspace**, which creates the first admin at `/signup`. After that, everyone else joins by invite.

Production: `npm run build && npm start`. Set `MONGODB_URI` in the environment.

## What it does

**Tasks**
- Title, description, priority, tags, a required deadline, and one or more owners.
- Status flow: To do → In progress → In review → Done. Completion time is recorded.
- Subtasks with a progress bar, comments, and a full activity timeline.
- List view grouped by Overdue / Due today / This week / Later / Completed, plus a drag-and-drop board.
- Owners are always shown by full name, never just initials.
- Completed tasks stay out of the way: the board and list hide them until you turn on **Completed**, and then show only the current week. Admins can switch to a single day and step back through earlier days or weeks.
- Search and filters by status, priority and owner. Scope is **My tasks** / **My team** for members and **My tasks** / **Team** / **Everyone** for admins.

**Teams**
- Admins create teams, pick a colour, and add or remove people (also from the add-person form).
- Members see their team's work on the task list and board, and their Team pulse compares them with their teammates rather than the whole company. Someone in no team sees only their own tasks.
- The admin overview ranks every team by a team ownership score (the average of its members' scores) with open, overdue, done-this-week and on-time figures; clicking a team opens its own overview with people table, charts and overdue list.

**Deadlines**
- Changing a deadline requires a written reason. Old date, new date, who, why, and when are stored on the task and shown in the task's deadline history.
- The original deadline is always kept, so "moved 3×" is visible on the task.
- Every task is classified automatically: on track, due soon (48h), overdue, done on time, done late.

**Personal dashboard** (every member)
- Ownership score (0–100) shown as a ring, with a label: Crushing it, On track, Slipping, Lagging, or Idle, and a one-line verdict in plain language.
- Tiles for open, overdue, due in 48h, done on time, done late.
- "Needs your attention" list, weekly completions chart (on time vs late), and the full task list.
- Team pulse: your teammates' scores and status side by side (everyone, for admins).

**Accounts and email**
- First admin signs up at `/signup` (only works while the database has no accounts).
- Admins add people from **People** in one of two ways: **email an invite** (a one-time link, valid 7 days, where they choose a password) or **set a temporary password** (emailed to them; they must change it on first sign-in before they can use the app).
- **Resend invite** for anyone who hasn't set a password yet; the link is also shown on screen to copy.
- **Forgot password** on the login page emails a one-time reset link valid for 60 minutes. Admins can also set a new temporary password from People.
- Everyone gets an email when a task is assigned to them (not for tasks they assign to themselves). It can be turned off under **Account**, reached by clicking your name in the sidebar, which is also where you change your password.

**Admin** (team overview)
- Team totals, team-by-team cards, sortable people table with every stat, workload chart, team completion trend.
- Per-team drill-down: team score and verdict, tiles, members ranked by score, charts, overdue list, and member management.
- Per-person drill-down with their dashboard, their deadline changes, and their tasks.
- Deadline log across the whole team with reasons and per-person counts.
- People management: add, set role, deactivate, reset password.

## Email setup

Nothing is required to run the app. Without an email provider, every email is printed to the server console and invite links appear in the admin UI, so you can still onboard people by sharing links yourself. To actually deliver email, set **one** of these in `.env.local` (or in Vercel's environment variables):

**Option A: Resend** (recommended; free for 3,000 emails/month)
1. Create an account at https://resend.com.
2. Add and verify your domain under *Domains* (add the DNS records they show). Until then, Resend only delivers to the address you signed up with, from `onboarding@resend.dev`, which is enough for testing.
3. Create an API key under *API Keys* and set:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   MAIL_FROM="Kokoon Task <tasks@yourdomain.com>"
   ```

**Option B: SMTP** (any provider; Gmail works for small teams)
1. In your Google account turn on 2-step verification, then create an *App password* (Security → App passwords) for "Mail".
2. Set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=you@gmail.com
   SMTP_PASS=the 16-character app password
   MAIL_FROM="Kokoon Task <you@gmail.com>"
   ```
   Gmail allows roughly 500 messages a day on a personal account.

Set `APP_URL` if links in emails should point somewhere other than the host the request came in on.

## How the ownership score works

Computed live from the person's tasks (see `src/lib/stats.ts`):

```
reliability  = (on-time rate over the last 30 days) ^ 1.5      (falls back to all-time, then 0.8)
overdue      = max(0, 1 − 0.4 × currently overdue tasks)
activity     = 1 if active in the last 7 days, 0.3 if within 14 days, else 0 (when they have open tasks)

score = 40 × reliability + 45 × overdue + 15 × activity
```

| Score | Label |
|---|---|
| 90–100 | Crushing it |
| 75–89 | On track |
| 50–74 | Slipping |
| below 50 | Lagging |

If someone has open tasks and no activity for 7+ days they are shown as **Idle** and their score is capped at 60, regardless of history. Deadline moves are counted and shown but do not directly change the score; the pattern is surfaced to the admin instead.

## Project layout

```
src/app/(app)/dashboard        personal dashboard
src/app/(app)/tasks            list + board, new task, task detail
src/app/(app)/admin            team overview, teams + team detail, people, person detail, deadline log
src/app/(app)/account          change password, email notifications
src/app/{signup,forgot-password,reset-password,invite}   public auth pages
src/lib/models.ts              Mongoose schemas (User, Session, Team, Task with embedded subtasks/comments/changes/activity)
src/lib/actions.ts             task, people and team mutations (server actions) with permission checks
src/lib/authActions.ts         sign-up, invites, password reset and change, notification preference
src/lib/mail.ts                email transport (Resend, SMTP, or console fallback)
src/lib/emails.ts              email copy and HTML
src/lib/tokens.ts              one-time invite and reset tokens (hashed at rest)
src/lib/notify.ts              assignment notification emails
src/lib/stats.ts               task health, ownership score, weekly buckets, team aggregates
src/lib/teams.ts               team membership helpers and per-team summaries
src/lib/period.ts              day / week window used for completed tasks
src/lib/queries.ts             reads, returning plain DTOs
scripts/seed.ts                demo data generator
```

Permissions: admins can do everything. Members can create tasks, and edit tasks they created or own. Only the creator or an admin can delete a task.

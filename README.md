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

Production: `npm run build && npm start`. Set `MONGODB_URI` (and the email variables) in the environment. See **Deploy** below for the EC2 setup this repo ships with.

## What it does

**Tasks**
- Title, description, priority, tags, a required deadline, and one or more owners.
- Status flow: To do → In progress → In review → Done. Completion time is recorded.
- Subtasks with a progress bar (rename or remove any of them), comments, and a full activity timeline.
- Works as an installed app on a phone: dialogs become bottom sheets that scroll, so their buttons are always reachable, and whenever the app comes back to the foreground it re-fetches the page so new or finished tasks appear without a reload.
- List view grouped by Overdue / Due today / This week / Later / Completed, plus a drag-and-drop board.
- Owners are always shown by full name, never just initials.
- Completed tasks stay out of the way: the board and list hide them until you turn on **Completed**, and then show only the current week. Admins can switch to a single day and step back through earlier days or weeks. When the current view is hiding finished tasks, a line under it says how many and offers *Show completed*.
- Feels instant on a slow connection: every page has a skeleton that appears the moment you tap a link, sidebar items, rows and cards show a spinner while they load, and the filter bar shows one while results update.
- The new-task form keeps what you typed if something is missing, and the Create button only enables once there is a title, a deadline and at least one owner.
- Search and filters by status, priority and owner. Scope is **My tasks** / **My team** for members and **My tasks** / **Team** / **Everyone** for admins. *My tasks* is the work assigned to you; tasks you created for other people show under Team / Everyone and on the task they feed.
- Changing any filter, the scope, the period or the list/board switch swaps the list for a skeleton at once, so a tap on a slow connection is never in doubt.

**Teams**
- Admins create teams, pick a colour, choose a **team owner**, and add or remove people (also from the add-person form). Member and owner pickers are searchable.
- The hierarchy is admin → team owner → team member. The owner reviews deadline changes their members ask for; an admin can also be a team member or owner.
- Members see their team's work on the task list and board, and their Team pulse compares them with their teammates rather than the whole company. Someone in no team sees only their own tasks.
- The admin overview ranks every team by a team ownership score (the average of its members' scores) with open, overdue, done-this-week and on-time figures; clicking a team opens its own overview with people table, charts and overdue list.

**People**
- Every name and avatar in the app links to that person's page (`/people/<id>`): their score, open and overdue counts, what needs their attention and their tasks. Admins see the full picture (plus flags and deadline changes); members see it for themselves and their teammates, the same people as on their Team pulse, and for anyone else only the work they share.

**Dependencies**
- A task can depend on work from other people. From the task page, *Add dependency* creates a real task for them with its own deadline (on or before the parent's), linked back to the task it feeds. It shows up in their list, board and dashboard like any task, wearing a **Dependency** tag, and counts in their ownership score the same way, so a late dependency costs its owner, not the person waiting on it.
- From the parent, *Edit* on a dependency changes its title, details and owners, and its deadline with a reason, under the same approval rules as any deadline change.
- The parent shows its dependencies with status and health, and a "still open" warning next to Mark done. In lists and on the board, a dependency says which task it feeds. Deleting a parent leaves its dependencies as ordinary tasks.
- Deadlines stay consistent: a dependency can't be moved past the task it feeds, and a task can't be pulled in before an open dependency. Both are checked when a change is made or requested, and again when a request is approved.

**Integrity flags**
- If someone marks a task done without the work being done, an admin or the owner's team owner can *Flag as not actually done* with a reason. The task is reopened, the owners are notified, and each active flag in the last 30 days takes 15 points off their ownership score (shown in the people table and on their page). Reviewers can clear a flag with a note once the work is real; a task's owners can never flag or clear their own.

**Deadlines**
- Changing a deadline requires a written reason. Old date, new date, who, why, who approved, and when are stored on the task and shown in the task's deadline history.
- **Approval:** admins move deadlines directly. Everyone else sends a request to the level above them: members to their team owner (or any admin), team owners to an admin. Until it is approved, the current deadline is the one the task is measured against; once approved, the new date counts. Reviewers get an email and see the request under **Approvals** (sidebar badge shows how many are waiting), on their dashboard, and on the task itself, where they can approve or turn it down with a note. The requester can withdraw it, and is emailed the decision. Only one request per task can be open at a time.
- The original deadline is always kept, so "moved 3×" is visible on the task.
- Every task is classified automatically: on track, due soon (48h), overdue, done on time, done late.
- **Reminders:** each owner of an open task gets a push and an email *Due in 2 days* 48 hours before the deadline (shifted to 8:00 if that would land at night) and *Due today* at 9:00 on the day itself (`REMINDER_HOUR`). Both are sent once per deadline, so an approved deadline change earns fresh ones, and neither is sent if the task was created or moved after that moment, because the assignment itself was the heads-up. The sweep runs inside the app every 10 minutes in production (`REMINDERS=off` disables it, `REMINDERS=on` enables it under `next dev`); an admin can run it by hand at `/api/reminders/run`, and an outside scheduler can call the same route with `Authorization: Bearer <CRON_SECRET>`.

**Personal dashboard** (every member)
- Ownership score (0–100) shown as a ring, with a label: Crushing it, On track, Slipping, Lagging, or Idle, and a one-line verdict in plain language.
- Tiles for open, overdue, due in 48h, done on time, done late.
- "Needs your attention" list, weekly completions chart (on time vs late), and the full task list.
- Team pulse: your teammates' scores and status side by side (everyone, for admins).

**Accounts and email**
- First admin signs up at `/signup`. After that anyone can **create their own account** there as a member (the login page links to it); they then appear in People, in the team member picker and in the task owner picker like everyone else. Limit sign-ups to your email domains with `SIGNUP_ALLOWED_DOMAINS`, or turn them off with `SIGNUP_DISABLED=1` to go invite-only.
- Admins add people from **People** in one of two ways: **email an invite** (a one-time link, valid 7 days, where they choose a password) or **set a temporary password** (emailed to them; they must change it on first sign-in before they can use the app).
- **Resend invite** for anyone who hasn't set a password yet; the link is also shown on screen to copy.
- **Forgot password** on the login page emails a one-time reset link valid for 60 minutes. Admins can also set a new temporary password from People.
- Everyone gets an email when a task is assigned to them (not for tasks they assign to themselves). It can be turned off under **Account**, reached by clicking your name in the sidebar, which is also where you change your password.

**Install it as an app**
- Kokoon Task is a PWA: on a phone, open the site and choose **Add to Home Screen** (iOS Safari) or **Install app** (Android Chrome); on desktop Chrome and Edge, use the install icon in the address bar. It opens full-screen with its own icon and shortcuts for New task and Board.
- A service worker caches the build's static files for fast repeat visits and shows an offline page when there is no connection. Pages and data are always fetched live, nothing personal is cached. Icons are generated by `node scripts/make-icons.mjs`.
- **Push notifications:** under Account, each person can turn on *Notify me on this device*. They then get a notification when a task is assigned to them, when a deadline change needs their approval, or when theirs is decided, plus the deadline reminders below, even with the app closed. Needs the VAPID keys in the environment (`npm run push:keys` prints a pair). On iPhone the app must be installed to the Home Screen first (iOS 16.4+).

**Admin** (team overview)
- Team totals, team-by-team cards, sortable people table with every stat, workload chart, team completion trend.
- Per-team drill-down: team score and verdict, tiles, members ranked by score, charts, overdue list, and member management.
- Per-person drill-down with their dashboard, their deadline changes, and their tasks.
- Deadline log across the whole team with reasons, who approved each change, per-person counts, and the requests still waiting.
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

## Deploy

The app runs on a single EC2 instance (Amazon Linux 2023) behind nginx, managed by pm2. Every push to `main` redeploys it through GitHub Actions.

**On the instance (one-time):** install `nodejs22`, `git`, `nginx` and `pm2`; clone the repo to `~/kokoon-lark`; put the real values in `~/kokoon-lark/.env.local` (never committed), add `APP_URL=http://<public-ip-or-domain>` so links in emails point at the live site, and `APP_TIMEZONE=Asia/Kolkata` (or your zone) so times render and reminders fire in the team's local time rather than the box's UTC; run `npm ci && npm run build`; start it with `pm2 start npm --name kokoon -- start && pm2 save && pm2 startup`; proxy port 80 to 3000 with nginx. MongoDB stays on Atlas: allow the instance's public IP under Atlas → Network Access.

**GitHub Actions:** `.github/workflows/deploy.yml` runs on every push to `main` (or manually from the Actions tab). It SSHes into the instance and runs `scripts/deploy.sh`, which builds the new commit in a staging copy (`~/kokoon-lark-stage`), swaps it in, restarts pm2, health-checks `/login`, and swaps the old copy back if the check fails. Env values come from the `.env.local` already on the server, so the only secret in GitHub is the SSH key.

Repository settings the workflow needs (Settings → Secrets and variables → Actions):

| Kind     | Name              | Value                                                                                  |
|----------|-------------------|----------------------------------------------------------------------------------------|
| Secret   | `EC2_SSH_KEY`     | private half of a dedicated deploy key pair; its public half goes in `~/.ssh/authorized_keys` on the instance |
| Variable | `EC2_HOST`        | instance public IP or DNS name                                                          |
| Variable | `EC2_USER`        | SSH user (`ec2-user` on Amazon Linux)                                                   |
| Variable | `EC2_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <host>`                                               |

The security group must allow inbound 22 (for the workflow) and 80/443 (for users).

**HTTPS:** with a DNS name pointing at the instance, `sudo dnf install -y certbot python3-certbot-nginx && sudo certbot --nginx -d <host> --redirect` issues a Let's Encrypt certificate, rewrites the nginx config and enables `certbot-renew.timer`. Then set `APP_URL=https://<host>` and `pm2 restart kokoon --update-env`. The session cookie is `secure` in production, so sign-in only works over HTTPS (or on localhost).

## Project layout

```
src/app/(app)/dashboard        personal dashboard
src/app/(app)/tasks            list + board, new task, task detail
src/app/(app)/admin            team overview, teams + team detail, people, person detail, deadline log
src/app/(app)/account          change password, email notifications
src/app/(app)/people/[id]      a person's page; every name and avatar links here
src/app/(app)/**/loading.tsx   per-route skeletons shown while a page loads
src/components/ui/Skeleton.tsx, LinkPending.tsx   skeleton blocks and the in-link spinner
src/app/{signup,forgot-password,reset-password,invite}   public auth pages
src/lib/models.ts              Mongoose schemas (User, Session, Team, Task with embedded subtasks/comments/changes/activity)
src/lib/actions.ts             task, people and team mutations (server actions) with permission checks
src/lib/approvals.ts           who may move a deadline directly, who must ask, and who decides
src/lib/integrity.ts           dependencies and "marked done but wasn't" flags, with the score penalty
src/lib/signupPolicy.ts        self sign-up rules from env (allowed domains, disabled)
src/lib/push.ts, pushActions.ts  Web Push sending and per-device subscriptions
src/lib/reminders.ts           deadline reminders (2 days before, morning of) and the in-process scheduler
src/lib/timezone.ts            APP_TIMEZONE handling and wall-clock helpers
src/instrumentation.ts         server start hook: applies the timezone, starts the reminder scheduler
src/app/api/reminders/run      runs one reminder sweep (admin session or CRON_SECRET)
src/app/(app)/approvals        deadline requests waiting for the signed-in reviewer, and their own
src/app/manifest.ts            web app manifest (PWA)
public/sw.js, public/offline.html   service worker and offline fallback
scripts/make-icons.mjs         renders the PWA icon set
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
scripts/deploy.sh              server-side deploy: staged build, swap, health check, rollback
.github/workflows/deploy.yml   push-to-main deployment over SSH
```

Permissions: admins can do everything. Members can create tasks, and edit tasks they created or own. Only the creator or an admin can delete a task.

/* Seeds a realistic team with ~8 weeks of task history. Run: npm run seed */
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { Session, Task, User } from "../src/lib/models";

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/kokoon-task";
const NOW = new Date();

const at = (daysFromNow: number, hour = 17, minute = 0): Date => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const hoursFromNow = (h: number): Date => new Date(NOW.getTime() + h * 3_600_000);

type Seed = {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  tags?: string[];
  assignees: string[];
  createdBy?: string;
  createdAt: Date;
  deadline: Date;
  /** completion offset in hours relative to deadline (negative = early) */
  doneHoursVsDeadline?: number;
  status?: "todo" | "in_progress" | "review";
  subtasks?: { title: string; done?: boolean }[];
  deadlineMoves?: { from: Date; to: Date; by: string; reason: string; when: Date }[];
  comments?: { by: string; body: string; when: Date }[];
  lastTouch?: Date; // when the last status activity happened (for ongoing tasks)
};

async function main() {
  await mongoose.connect(URI);
  console.log(`Connected to ${URI}`);
  await Promise.all([User.deleteMany({}), Task.deleteMany({}), Session.deleteMany({})]);

  const pw = async (p: string) => bcrypt.hash(p, 10);
  const people = [
    { key: "anurag", name: "Anurag Sarkar", email: "admin@kokoon.ai", role: "admin", title: "Founder", color: "#0b0b0b", password: "admin123" },
    { key: "priya", name: "Priya Nair", email: "priya@kokoon.ai", role: "member", title: "Product designer", color: "#2a78d6", password: "password123" },
    { key: "rohan", name: "Rohan Mehta", email: "rohan@kokoon.ai", role: "member", title: "Backend engineer", color: "#eb6834", password: "password123" },
    { key: "sara", name: "Sara Khan", email: "sara@kokoon.ai", role: "member", title: "Frontend engineer", color: "#1baf7a", password: "password123" },
    { key: "dev", name: "Dev Patel", email: "dev@kokoon.ai", role: "member", title: "Growth & marketing", color: "#6250d6", password: "password123" },
    { key: "meera", name: "Meera Iyer", email: "meera@kokoon.ai", role: "member", title: "Operations", color: "#e87ba4", password: "password123" },
  ] as const;

  const ids: Record<string, Types.ObjectId> = {};
  const names: Record<string, string> = {};
  for (const p of people) {
    const u = await User.create({ name: p.name, email: p.email, role: p.role, title: p.title, color: p.color, passwordHash: await pw(p.password) });
    ids[p.key] = u._id;
    names[p.key] = p.name;
  }

  const seeds: Seed[] = [
    /* ---------- Priya: strong performer ---------- */
    { title: "Redesign onboarding flow", tags: ["design", "onboarding"], priority: "high", assignees: ["priya"], createdAt: at(-52), deadline: at(-45), doneHoursVsDeadline: -20, subtasks: [{ title: "Audit current flow", done: true }, { title: "Wireframes v1", done: true }, { title: "Usability test with 5 users", done: true }] },
    { title: "Design system: button & input tokens", tags: ["design-system"], assignees: ["priya"], createdAt: at(-44), deadline: at(-38), doneHoursVsDeadline: -30 },
    { title: "Pricing page mockups", tags: ["design", "marketing"], priority: "high", assignees: ["priya", "dev"], createdAt: at(-36), deadline: at(-30), doneHoursVsDeadline: -5, comments: [{ by: "dev", body: "Love the comparison table. Can we add an annual toggle?", when: at(-33, 11) }, { by: "priya", body: "Added in v3, check the Figma.", when: at(-32, 15) }] },
    { title: "Empty states illustrations", tags: ["design"], priority: "low", assignees: ["priya"], createdAt: at(-29), deadline: at(-22), doneHoursVsDeadline: 6 },
    { title: "Mobile nav redesign", tags: ["design", "mobile"], assignees: ["priya"], createdAt: at(-21), deadline: at(-15), doneHoursVsDeadline: -48 },
    { title: "Settings page IA", tags: ["design"], assignees: ["priya"], createdAt: at(-14), deadline: at(-9), doneHoursVsDeadline: -12 },
    { title: "Dashboard chart style guide", tags: ["design-system", "charts"], priority: "high", assignees: ["priya"], createdAt: at(-8), deadline: at(-2), doneHoursVsDeadline: -3, subtasks: [{ title: "Color ramps", done: true }, { title: "Tooltip spec", done: true }] },
    { title: "Notification center designs", tags: ["design"], assignees: ["priya"], createdAt: at(-5), deadline: at(6), status: "in_progress", lastTouch: at(-1, 10), subtasks: [{ title: "Inbox list", done: true }, { title: "Preferences", done: false }, { title: "Mobile variant", done: false }] },
    { title: "Review Sara's component PRs", tags: ["review"], priority: "medium", assignees: ["priya"], createdAt: at(-2), deadline: hoursFromNow(30), status: "todo" },

    /* ---------- Rohan: solid but slipping ---------- */
    { title: "Auth service: refresh tokens", tags: ["backend", "auth"], priority: "urgent", assignees: ["rohan"], createdAt: at(-50), deadline: at(-43), doneHoursVsDeadline: -10 },
    { title: "Postgres → read replica setup", tags: ["infra"], priority: "high", assignees: ["rohan"], createdAt: at(-42), deadline: at(-35), doneHoursVsDeadline: 40, comments: [{ by: "rohan", body: "Replica lag was higher than expected, took an extra day to tune.", when: at(-33, 9) }] },
    { title: "Rate limiting middleware", tags: ["backend"], assignees: ["rohan"], createdAt: at(-34), deadline: at(-28), doneHoursVsDeadline: -8 },
    { title: "Webhook delivery retries", tags: ["backend"], priority: "high", assignees: ["rohan", "sara"], createdAt: at(-27), deadline: at(-20), doneHoursVsDeadline: 70, deadlineMoves: [{ from: at(-23), to: at(-20), by: "rohan", reason: "Blocked on the queue library upgrade, needs 3 more days.", when: at(-24, 16) }] },
    { title: "Billing reconciliation job", tags: ["backend", "billing"], assignees: ["rohan"], createdAt: at(-19), deadline: at(-12), doneHoursVsDeadline: -4 },
    { title: "Search indexing pipeline", tags: ["backend", "search"], priority: "high", assignees: ["rohan"], createdAt: at(-12), deadline: at(-6), doneHoursVsDeadline: -24 },
    { title: "API v2 pagination", tags: ["backend", "api"], priority: "high", assignees: ["rohan"], createdAt: at(-10), deadline: at(-3), status: "in_progress", lastTouch: at(-2, 18), subtasks: [{ title: "Cursor encoding", done: true }, { title: "Update SDK", done: false }] },
    { title: "Fix flaky integration tests", tags: ["backend", "quality"], assignees: ["rohan"], createdAt: at(-7), deadline: at(-1, 12), status: "review", lastTouch: at(-1, 14) },
    { title: "Export to CSV endpoint", tags: ["backend", "api"], assignees: ["rohan"], createdAt: at(-3), deadline: at(4), status: "todo" },

    /* ---------- Sara: on track ---------- */
    { title: "Component library: Table", tags: ["frontend", "design-system"], assignees: ["sara"], createdAt: at(-49), deadline: at(-42), doneHoursVsDeadline: -15 },
    { title: "Dark mode tokens", tags: ["frontend"], priority: "low", assignees: ["sara"], createdAt: at(-40), deadline: at(-33), doneHoursVsDeadline: -60 },
    { title: "Onboarding flow implementation", tags: ["frontend", "onboarding"], priority: "high", assignees: ["sara", "priya"], createdAt: at(-37), deadline: at(-26), doneHoursVsDeadline: -6, subtasks: [{ title: "Step 1–3 screens", done: true }, { title: "Progress persistence", done: true }, { title: "Analytics events", done: true }] },
    { title: "Performance: bundle under 200kb", tags: ["frontend", "perf"], priority: "high", assignees: ["sara"], createdAt: at(-25), deadline: at(-18), doneHoursVsDeadline: 14 },
    { title: "Pricing page build", tags: ["frontend", "marketing"], assignees: ["sara"], createdAt: at(-17), deadline: at(-11), doneHoursVsDeadline: -20 },
    { title: "Settings page build", tags: ["frontend"], assignees: ["sara"], createdAt: at(-9), deadline: at(-4), doneHoursVsDeadline: -9 },
    { title: "Charts: weekly completions component", tags: ["frontend", "charts"], priority: "high", assignees: ["sara"], createdAt: at(-4), deadline: hoursFromNow(20), status: "in_progress", lastTouch: at(0, 9), subtasks: [{ title: "Stacked bars", done: true }, { title: "Tooltip", done: true }, { title: "Table view", done: false }] },
    { title: "Accessibility pass on forms", tags: ["frontend", "a11y"], assignees: ["sara"], createdAt: at(-3), deadline: at(5), status: "todo" },
    { title: "Mobile nav implementation", tags: ["frontend", "mobile"], assignees: ["sara"], createdAt: at(-2), deadline: at(9), status: "todo" },

    /* ---------- Dev: lagging ---------- */
    { title: "Launch blog: 'Why ownership matters'", tags: ["marketing", "content"], assignees: ["dev"], createdAt: at(-48), deadline: at(-41), doneHoursVsDeadline: -3 },
    { title: "Q3 newsletter", tags: ["marketing", "email"], assignees: ["dev"], createdAt: at(-39), deadline: at(-34), doneHoursVsDeadline: 55 },
    { title: "Product Hunt launch plan", tags: ["marketing", "launch"], priority: "urgent", assignees: ["dev", "anurag"], createdAt: at(-33), deadline: at(-20), doneHoursVsDeadline: 120, deadlineMoves: [{ from: at(-27), to: at(-23), by: "dev", reason: "Waiting on final screenshots from design.", when: at(-28, 10) }, { from: at(-23), to: at(-20), by: "dev", reason: "Hunter unavailable that week, moving launch to Thursday.", when: at(-24, 12) }], comments: [{ by: "anurag", body: "This has moved twice now. What's the real blocker?", when: at(-23, 9) }] },
    { title: "SEO audit", tags: ["marketing", "seo"], assignees: ["dev"], createdAt: at(-22), deadline: at(-15), doneHoursVsDeadline: 30 },
    { title: "Case study: Acme onboarding", tags: ["marketing", "content"], priority: "high", assignees: ["dev"], createdAt: at(-18), deadline: at(-8), status: "in_progress", lastTouch: at(-6, 15), deadlineMoves: [{ from: at(-12), to: at(-8), by: "dev", reason: "Customer hasn't approved the quotes yet.", when: at(-13, 17) }] },
    { title: "Paid ads experiment: LinkedIn", tags: ["marketing", "ads"], assignees: ["dev"], createdAt: at(-14), deadline: at(-5), status: "todo" },
    { title: "Refresh landing page copy", tags: ["marketing", "content"], assignees: ["dev"], createdAt: at(-9), deadline: at(-2), status: "in_progress", lastTouch: at(-4, 11), subtasks: [{ title: "Hero copy", done: true }, { title: "Feature section", done: false }, { title: "FAQ", done: false }] },
    { title: "October metrics report", tags: ["marketing", "reporting"], assignees: ["dev"], createdAt: at(-6), deadline: at(3), status: "todo" },

    /* ---------- Meera: idle ---------- */
    { title: "Vendor contracts renewal", tags: ["ops", "legal"], assignees: ["meera"], createdAt: at(-55), deadline: at(-47), doneHoursVsDeadline: -24 },
    { title: "Set up expense policy", tags: ["ops", "finance"], assignees: ["meera"], createdAt: at(-46), deadline: at(-40), doneHoursVsDeadline: -10 },
    { title: "Offsite logistics", tags: ["ops", "events"], priority: "high", assignees: ["meera", "anurag"], createdAt: at(-40), deadline: at(-32), doneHoursVsDeadline: -36, subtasks: [{ title: "Venue", done: true }, { title: "Travel", done: true }, { title: "Agenda", done: true }] },
    { title: "Hiring pipeline: ops associate", tags: ["ops", "hiring"], assignees: ["meera"], createdAt: at(-20), deadline: at(7), status: "in_progress", lastTouch: at(-11, 16), subtasks: [{ title: "Job description", done: true }, { title: "Post on 3 boards", done: false }, { title: "Screen first 10", done: false }] },
    { title: "Insurance renewal paperwork", tags: ["ops"], assignees: ["meera"], createdAt: at(-15), deadline: at(12), status: "todo" },

    /* ---------- Anurag ---------- */
    { title: "Investor update – October", tags: ["founder", "investors"], priority: "high", assignees: ["anurag"], createdAt: at(-16), deadline: at(-10), doneHoursVsDeadline: -30 },
    { title: "Define Q1 roadmap", tags: ["founder", "planning"], priority: "high", assignees: ["anurag", "priya", "rohan"], createdAt: at(-5), deadline: at(10), status: "in_progress", lastTouch: at(-1, 19), subtasks: [{ title: "Collect team proposals", done: true }, { title: "Prioritise top 5", done: false }, { title: "Share with team", done: false }], comments: [{ by: "priya", body: "Added design proposals to the doc.", when: at(-2, 12) }] },
  ];

  const docs = seeds.map((s) => {
    const creator = ids[s.createdBy ?? "anurag"]!;
    const assignees = s.assignees.map((k) => ids[k]!);
    const originalDeadline = s.deadlineMoves?.[0]?.from ?? s.deadline;
    const activity: { userId: Types.ObjectId; type: string; detail: string; createdAt: Date }[] = [
      { userId: creator, type: "created", detail: `Created the task and assigned it to ${s.assignees.map((k) => names[k]).join(", ")}.`, createdAt: s.createdAt },
    ];
    for (const m of s.deadlineMoves ?? []) {
      activity.push({ userId: ids[m.by]!, type: "deadline", detail: `Deadline pushed later: ${m.from.toDateString()} → ${m.to.toDateString()}. Reason: ${m.reason}`, createdAt: m.when });
    }
    for (const c of s.comments ?? []) activity.push({ userId: ids[c.by]!, type: "comment", detail: "Left a comment.", createdAt: c.when });

    const owner = assignees[0]!;
    let status: string = s.status ?? "todo";
    let completedAt: Date | null = null;
    let completedBy: Types.ObjectId | null = null;
    if (s.doneHoursVsDeadline !== undefined) {
      status = "done";
      completedAt = new Date(s.deadline.getTime() + s.doneHoursVsDeadline * 3_600_000);
      completedBy = owner;
      const started = new Date(s.createdAt.getTime() + Math.max(2, (completedAt.getTime() - s.createdAt.getTime()) / 3_600_000 / 3) * 3_600_000);
      activity.push({ userId: owner, type: "status", detail: "Moved from To do to In progress.", createdAt: started });
      activity.push({ userId: owner, type: "completed", detail: s.doneHoursVsDeadline > 0 ? "Marked the task done — after the deadline." : "Marked the task done — on time.", createdAt: completedAt });
    } else if (status !== "todo" && s.lastTouch) {
      activity.push({ userId: owner, type: "status", detail: `Moved from To do to ${status === "review" ? "In review" : "In progress"}.`, createdAt: s.lastTouch });
    }

    const subtasks = (s.subtasks ?? []).map((st, i) => {
      const doneAt = st.done ? new Date((completedAt ?? s.lastTouch ?? s.createdAt).getTime() - (i + 1) * 5 * 3_600_000) : null;
      if (doneAt) activity.push({ userId: owner, type: "subtask_done", detail: `Completed subtask "${st.title}".`, createdAt: doneAt });
      return { title: st.title, isDone: !!st.done, completedAt: doneAt, completedBy: doneAt ? owner : null, createdAt: s.createdAt };
    });

    activity.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      title: s.title,
      description: s.description ?? defaultDescription(s.title),
      priority: s.priority ?? "medium",
      status,
      deadline: s.deadline,
      originalDeadline,
      createdBy: creator,
      assignees,
      tags: s.tags ?? [],
      completedAt,
      completedBy,
      subtasks,
      deadlineChanges: (s.deadlineMoves ?? []).map((m) => ({ oldDeadline: m.from, newDeadline: m.to, reason: m.reason, changedBy: ids[m.by]!, createdAt: m.when })),
      comments: (s.comments ?? []).map((c) => ({ userId: ids[c.by]!, body: c.body, createdAt: c.when })),
      activity,
      createdAt: s.createdAt,
      updatedAt: completedAt ?? s.lastTouch ?? s.createdAt,
    };
  });

  await Task.insertMany(docs);
  console.log(`Seeded ${people.length} people and ${docs.length} tasks.`);
  console.log("Admin login:  admin@kokoon.ai / admin123");
  console.log("Member login: priya@kokoon.ai / password123 (same password for rohan, sara, dev, meera)");
  await mongoose.disconnect();
}

function defaultDescription(title: string): string {
  return `${title}. Keep the subtasks updated so the team can see progress, and move the deadline only with a reason.`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

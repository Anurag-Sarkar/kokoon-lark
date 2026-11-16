/* Email copy. Each function returns subject + plain text + HTML for sendMail(). */

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function layout(heading: string, paragraphs: string[], cta?: { href: string; label: string }, footnote?: string): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#2a2a28">${p}</p>`).join("");
  const button = cta
    ? `<p style="margin:22px 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#0b0b0b;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px">${esc(cta.label)}</a></p>
       <p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#7a7a76">If the button doesn't work, copy this link into your browser:<br><a href="${esc(cta.href)}" style="color:#2a78d6;word-break:break-all">${esc(cta.href)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f3;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e6e6e2;border-radius:16px">
      <tr><td style="padding:28px 32px 8px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px"><span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:#0b0b0b;vertical-align:middle"></span><span style="font-weight:600;font-size:15px;color:#0b0b0b;vertical-align:middle;margin-left:8px">Kokoon Task</span></div>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b0b0b;letter-spacing:-0.01em">${esc(heading)}</h1>
        ${body}${button}
      </td></tr>
      <tr><td style="padding:8px 32px 26px;font-size:12px;line-height:1.5;color:#7a7a76;border-top:1px solid #efefeb">${footnote ? esc(footnote) : "You're getting this because you have a Kokoon Task account."}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export function inviteEmail(p: { name: string; inviterName: string; link: string; days: number }): MailContent {
  const first = p.name.split(" ")[0];
  return {
    subject: `${p.inviterName} added you to Kokoon Task`,
    text: `Hi ${first},\n\n${p.inviterName} added you to Kokoon Task, where the team tracks tasks, deadlines and ownership.\n\nSet your password to get started (the link works for ${p.days} days):\n${p.link}\n\nIf you weren't expecting this, you can ignore it.`,
    html: layout(
      `${esc(p.inviterName)} added you to Kokoon Task`,
      [`Hi ${esc(first)},`, `${esc(p.inviterName)} added you to <strong>Kokoon Task</strong>, where the team tracks tasks, deadlines and who owns what.`, `Set a password to get started. The link works for ${p.days} days.`],
      { href: p.link, label: "Set my password" },
      "If you weren't expecting this, you can ignore it and nothing will happen."
    ),
  };
}

export function tempPasswordEmail(p: { name: string; email: string; tempPassword: string; loginUrl: string; byName: string; reason: "created" | "reset" }): MailContent {
  const first = p.name.split(" ")[0];
  const heading = p.reason === "created" ? "Your Kokoon Task account is ready" : "Your Kokoon Task password was reset";
  const intro = p.reason === "created"
    ? `${p.byName} created a Kokoon Task account for you.`
    : `${p.byName} reset your Kokoon Task password.`;
  return {
    subject: heading,
    text: `Hi ${first},\n\n${intro}\n\nSign in at ${p.loginUrl}\nEmail: ${p.email}\nTemporary password: ${p.tempPassword}\n\nYou'll be asked to choose your own password the first time you sign in.`,
    html: layout(
      heading,
      [
        `Hi ${esc(first)},`,
        esc(intro),
        `<span style="display:block;background:#f6f6f3;border-radius:10px;padding:12px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px">Email: ${esc(p.email)}<br>Temporary password: <strong>${esc(p.tempPassword)}</strong></span>`,
        `You'll be asked to choose your own password the first time you sign in.`,
      ],
      { href: p.loginUrl, label: "Sign in" }
    ),
  };
}

export function resetLinkEmail(p: { name: string; link: string; minutes: number }): MailContent {
  const first = p.name.split(" ")[0];
  return {
    subject: "Reset your Kokoon Task password",
    text: `Hi ${first},\n\nSomeone asked to reset the password for this Kokoon Task account. If that was you, open this link (it works for ${p.minutes} minutes):\n${p.link}\n\nIf it wasn't you, ignore this email. Your password stays the same.`,
    html: layout(
      "Reset your password",
      [`Hi ${esc(first)},`, `Someone asked to reset the password for this Kokoon Task account. If that was you, choose a new password below. The link works for ${p.minutes} minutes.`],
      { href: p.link, label: "Choose a new password" },
      "If it wasn't you, ignore this email. Your password stays the same."
    ),
  };
}

export function assignedEmail(p: { name: string; taskTitle: string; byName: string; deadlineLabel: string; priorityLabel: string; link: string; coOwners: string[] }): MailContent {
  const first = p.name.split(" ")[0];
  const with_ = p.coOwners.length ? ` together with ${p.coOwners.join(", ")}` : "";
  return {
    subject: `New task for you: ${p.taskTitle}`,
    text: `Hi ${first},\n\n${p.byName} assigned you "${p.taskTitle}"${with_}.\n\nDeadline: ${p.deadlineLabel}\nPriority: ${p.priorityLabel}\n\nOpen it: ${p.link}\n\nYou can turn these emails off under Account in Kokoon Task.`,
    html: layout(
      `${esc(p.byName)} assigned you a task`,
      [
        `Hi ${esc(first)},`,
        `<strong>${esc(p.taskTitle)}</strong> is now yours${esc(with_)}.`,
        `<span style="display:block;background:#f6f6f3;border-radius:10px;padding:12px 14px;font-size:14px">Deadline: <strong>${esc(p.deadlineLabel)}</strong><br>Priority: ${esc(p.priorityLabel)}</span>`,
      ],
      { href: p.link, label: "Open the task" },
      "You can turn these emails off under Account in Kokoon Task."
    ),
  };
}

export function deadlineRequestEmail(p: { name: string; requesterName: string; taskTitle: string; oldLabel: string; newLabel: string; shift: string; reason: string; link: string }): MailContent {
  const first = p.name.split(" ")[0];
  return {
    subject: `${p.requesterName} wants to move a deadline: ${p.taskTitle}`,
    text: `Hi ${first},\n\n${p.requesterName} asked to move the deadline of "${p.taskTitle}" (${p.shift}):\n${p.oldLabel} → ${p.newLabel}\n\nReason: ${p.reason}\n\nThe current deadline stays until you approve or turn this down:\n${p.link}`,
    html: layout(
      `${esc(p.requesterName)} wants to move a deadline`,
      [
        `Hi ${esc(first)},`,
        `${esc(p.requesterName)} asked to move the deadline of <strong>${esc(p.taskTitle)}</strong> (${esc(p.shift)}).`,
        `<span style="display:block;background:#f6f6f3;border-radius:10px;padding:12px 14px;font-size:14px">${esc(p.oldLabel)} &rarr; <strong>${esc(p.newLabel)}</strong><br><span style="color:#7a7a76">Reason:</span> ${esc(p.reason)}</span>`,
        `The current deadline keeps counting until you decide.`,
      ],
      { href: p.link, label: "Review the request" },
      "You're getting this because you own this person's team, or you're an admin."
    ),
  };
}

export function deadlineDecisionEmail(p: { name: string; reviewerName: string; taskTitle: string; approved: boolean; oldLabel: string; newLabel: string; note: string; link: string }): MailContent {
  const first = p.name.split(" ")[0];
  const heading = p.approved ? `Deadline approved: ${p.taskTitle}` : `Deadline change not approved: ${p.taskTitle}`;
  const line = p.approved
    ? `${p.reviewerName} approved your request. The deadline is now ${p.newLabel} and that's the date you'll be measured against.`
    : `${p.reviewerName} turned down your request to move the deadline to ${p.newLabel}. It stays ${p.oldLabel}.`;
  return {
    subject: heading,
    text: `Hi ${first},\n\n${line}${p.note ? `\n\nNote from ${p.reviewerName}: ${p.note}` : ""}\n\nOpen the task: ${p.link}`,
    html: layout(
      heading,
      [`Hi ${esc(first)},`, esc(line), ...(p.note ? [`<span style="display:block;background:#f6f6f3;border-radius:10px;padding:12px 14px;font-size:14px"><span style="color:#7a7a76">Note from ${esc(p.reviewerName)}:</span> ${esc(p.note)}</span>`] : [])],
      { href: p.link, label: "Open the task" }
    ),
  };
}

export function flaggedEmail(p: { name: string; byName: string; taskTitle: string; reason: string; link: string }): MailContent {
  const first = p.name.split(" ")[0];
  return {
    subject: `Flagged: ${p.taskTitle} was marked done but isn't`,
    text: `Hi ${first},\n\n${p.byName} flagged "${p.taskTitle}" as marked done without the work being done, and reopened it.\n\nReason: ${p.reason}\n\nThis counts against your ownership score until the flag is cleared. Finish the task properly, then talk to ${p.byName} if you think this is wrong.\n\nOpen the task: ${p.link}`,
    html: layout(
      `${esc(p.byName)} flagged a task you marked done`,
      [
        `Hi ${esc(first)},`,
        `<strong>${esc(p.taskTitle)}</strong> was marked done, but ${esc(p.byName)} says the work isn't done. It has been reopened.`,
        `<span style="display:block;background:#f6f6f3;border-radius:10px;padding:12px 14px;font-size:14px"><span style="color:#7a7a76">Reason:</span> ${esc(p.reason)}</span>`,
        `This counts against your ownership score until the flag is cleared. Finish the task properly, then talk to ${esc(p.byName)} if you think this is wrong.`,
      ],
      { href: p.link, label: "Open the task" }
    ),
  };
}

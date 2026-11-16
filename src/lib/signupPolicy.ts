/* Self sign-up policy, driven by env so a public deployment can be locked down without a code change. */

/** SIGNUP_DISABLED=1 turns self sign-up off: accounts then only come from invites (the first admin can always sign up). */
export function signupDisabled(): boolean {
  const v = (process.env.SIGNUP_DISABLED ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** SIGNUP_ALLOWED_DOMAINS=kokoonlabs.com,pixxo.io limits sign-up to those email domains. Empty = any address. */
export function allowedSignupDomains(): string[] {
  return (process.env.SIGNUP_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function signupEmailAllowed(email: string): boolean {
  const domains = allowedSignupDomains();
  if (domains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domains.includes(domain);
}

/** "@kokoonlabs.com or @pixxo.io" for hints and error messages; empty string when any domain is fine. */
export function allowedDomainsLabel(): string {
  return allowedSignupDomains().map((d) => `@${d}`).join(" or ");
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card p-10 text-center">
      <p className="text-lg font-semibold">That page doesn't exist</p>
      <p className="mt-1 text-sm text-ink-3">The task may have been deleted, or the link is wrong.</p>
      <Link href="/dashboard" className="btn btn-primary mt-5">Back to dashboard</Link>
    </div>
  );
}

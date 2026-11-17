import { redirect } from "next/navigation";

/** People pages moved to /people/[id] so every name in the app can link there; old links keep working. */
export default async function LegacyPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/people/${id}`);
}

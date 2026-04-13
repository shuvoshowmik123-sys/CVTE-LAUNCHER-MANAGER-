import { ShieldCheck, ShieldEllipsis, Workflow } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/dashboard/login-form";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const notes = [
  "No public sign-up path. The first super admin is seeded from environment variables.",
  "Approvals issue device-bound offline licenses instead of fragile always-online checks.",
  "Super admins can disable operators and invalidate active sessions immediately.",
];

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-zinc-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Secure operator entry
            </div>
            <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-tight text-white">
              A cleaner control room for Launcher Manager approvals.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-zinc-300">
              This panel is designed to keep activation precise: every request is reviewable, every issued license is signed, and every operator action is auditable.
            </p>
          </div>
          <div className="grid gap-4">
            {notes.map((note, index) => (
              <div key={note} className="flex items-start gap-4 rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-zinc-100">
                  {index === 0 ? <ShieldEllipsis className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
                </div>
                <p className="text-sm leading-7 text-zinc-300">{note}</p>
              </div>
            ))}
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

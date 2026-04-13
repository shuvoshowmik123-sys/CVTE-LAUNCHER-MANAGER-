import Link from "next/link";
import { ArrowRight, BadgeCheck, KeyRound, ShieldEllipsis, Waypoints } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const highlights = [
  {
    icon: ShieldEllipsis,
    title: "Signed offline activation",
    description: "Approve once, issue an Ed25519 license, and let Launcher Manager verify locally without always-online fragility.",
  },
  {
    icon: Waypoints,
    title: "Role-based control",
    description: "Separate super-admin governance from day-to-day approvals so access stays clean and revocable.",
  },
  {
    icon: KeyRound,
    title: "Device-bound licensing",
    description: "Bind approval to one normalized device fingerprint so copied packages do not become reusable by default.",
  },
];

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            Launcher Manager Activation Server
          </div>
          <Button asChild variant="outline">
            <Link href="/login">Admin login</Link>
          </Button>
        </div>

        <section className="grid gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-zinc-300">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                Vercel-native, Neon-backed, no custom server hacks
              </div>
              <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Protect Launcher Manager with approval-first activation and clean operator control.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-300">
                This control panel is built for one job: approve real devices, issue signed offline licenses, revoke access cleanly, and keep the activation workflow stable enough for long-term field use.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/login">
                  Open operator console
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#highlights">Review system guarantees</a>
              </Button>
            </div>
          </div>

          <Card className="glass-panel border-white/10 bg-white/5 shadow-2xl shadow-emerald-950/20">
            <CardHeader>
              <CardTitle className="font-[var(--font-display)] text-2xl text-white">Operator promises</CardTitle>
              <CardDescription className="text-zinc-300">
                The activation server is designed to stay auditable, revocable, and safe to deploy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-200">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Protected actions remain locked until a device is approved by an admin or super admin.
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Valid licenses continue to work offline until expiry, so temporary network failures do not break working TVs.
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Super admins can disable operator accounts immediately and invalidate all active sessions in one action.
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="highlights" className="grid gap-6 pb-12 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="glass-panel border-white/10 bg-white/5">
                <CardHeader>
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-white">{item.title}</CardTitle>
                  <CardDescription className="text-zinc-300">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}

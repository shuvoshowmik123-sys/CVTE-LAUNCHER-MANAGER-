import { redirect } from "next/navigation";

import { PageShell } from "@/components/dashboard/page-shell";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/session";
import { getSecuritySettings } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, settings] = await Promise.all([getCurrentSession(), getSecuritySettings()]);
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <PageShell
        title="Security settings"
        description="These controls shape how device activations are issued, renewed, and governed across the fleet."
      >
        <SettingsForm
          csrfToken={session.csrfToken}
          initialSettings={{
            issuer: settings.issuer,
            tokenValidityDays: settings.tokenValidityDays,
            renewalWindowDays: settings.renewalWindowDays,
            activationEnabled: settings.activationEnabled,
            allowAdminApprovals: settings.allowAdminApprovals,
          }}
        />
      </PageShell>

      <Card className="glass-panel border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Signing metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-300">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <span>Public key ID</span>
            <Badge variant="muted">{settings.publicKeyId}</Badge>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 leading-7">
            Private signing material stays only in Vercel environment variables. This UI exposes policy metadata, not secret key material.
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 leading-7">
            When you disable admin approvals, only super admins can approve activation requests. Existing valid offline licenses keep working until they expire or are revoked.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

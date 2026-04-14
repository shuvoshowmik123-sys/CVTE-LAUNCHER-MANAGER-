import { AlertTriangle, BarChart3, Clock4, Cpu, ShieldCheck, Users } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardMetrics } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardMetrics();
  const isSuperAdmin = data.currentUser.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Pending activations" value={data.metrics.pendingActivations} icon={<Clock4 className="h-5 w-5" />} delay={0} />
        <MetricCard title="Active licenses" value={data.metrics.activeLicenses} icon={<ShieldCheck className="h-5 w-5" />} delay={0.05} />
        <MetricCard title="Revoked licenses" value={data.metrics.revokedLicenses} icon={<BarChart3 className="h-5 w-5" />} delay={0.1} />
        <MetricCard title="Tracked devices" value={data.metrics.trackedDevices} icon={<Cpu className="h-5 w-5" />} delay={0.15} />
        <MetricCard title="Open anomalies" value={data.metrics.openAnomalies} icon={<AlertTriangle className="h-5 w-5" />} delay={0.2} />
        <MetricCard title="Operator accounts" value={data.metrics.adminUsers} icon={<Users className="h-5 w-5" />} delay={0.25} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {isSuperAdmin ? (
          <PageShell
            title="Recent audit activity"
            description="Only super admins can review sensitive operator activity, access changes, and security actions."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentAudit.map((entry, index) => (
                  <TableRow key={entry.id} className="animate-row-enter" style={{ animationDelay: `${index * 50}ms` }}>
                    <TableCell className="font-medium text-white">{entry.action}</TableCell>
                    <TableCell>{entry.actorEmail ?? "System"}</TableCell>
                    <TableCell>{entry.targetType}</TableCell>
                    <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PageShell>
        ) : (
          <PageShell
            title="Client-safe overview"
            description="This view keeps the dashboard useful without exposing internal operator login or audit activity."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Pending queue</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.metrics.pendingActivations}</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Devices waiting for approval or manual review.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Active licenses</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.metrics.activeLicenses}</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Devices currently holding an active offline certificate.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Revoked licenses</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.metrics.revokedLicenses}</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Licenses that were intentionally disabled by an operator.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Approval mode</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {data.settings.allowAdminApprovals ? "Admin approvals enabled" : "Super admin approvals only"}
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Current policy applied to device approval requests.
                </p>
              </div>
            </div>
          </PageShell>
        )}

        <Card className="glass-panel border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Activation policy snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-300">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Issuer</span>
              <span className="font-medium text-white">{data.settings.issuer}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Token validity</span>
              <Badge variant="muted">{data.settings.tokenValidityDays} days</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Renewal window</span>
              <Badge variant="muted">{data.settings.renewalWindowDays} days</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Activation requests</span>
              <Badge variant={data.settings.activationEnabled ? "default" : "destructive"}>
                {data.settings.activationEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Admin approvals</span>
              <Badge variant={data.settings.allowAdminApprovals ? "default" : "warning"}>
                {data.settings.allowAdminApprovals ? "Allowed" : "Super admin only"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

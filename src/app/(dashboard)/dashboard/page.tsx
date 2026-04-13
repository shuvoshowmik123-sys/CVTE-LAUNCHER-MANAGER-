import { BarChart3, Clock4, ShieldCheck, Users } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Pending activations" value={data.metrics.pendingActivations} icon={Clock4} />
        <MetricCard title="Active licenses" value={data.metrics.activeLicenses} icon={ShieldCheck} />
        <MetricCard title="Revoked licenses" value={data.metrics.revokedLicenses} icon={BarChart3} />
        <MetricCard title="Operator accounts" value={data.metrics.adminUsers} icon={Users} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <PageShell
          title="Recent audit activity"
          description="Every sensitive action stays visible so approvals and revocations can be traced later."
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
              {data.recentAudit.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium text-white">{entry.action}</TableCell>
                  <TableCell>{entry.actorEmail ?? "System"}</TableCell>
                  <TableCell>{entry.targetType}</TableCell>
                  <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </PageShell>

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

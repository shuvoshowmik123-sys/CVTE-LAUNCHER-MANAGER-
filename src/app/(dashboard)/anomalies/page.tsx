import Link from "next/link";

import { PageShell } from "@/components/dashboard/page-shell";
import { ResolveAnomalyForm } from "@/components/dashboard/resolve-anomaly-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentSession } from "@/lib/auth/session";
import { listAnomalyFlags } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function severityVariant(severity: string) {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "destructive" as const;
  }
  if (severity === "MEDIUM") {
    return "warning" as const;
  }
  return "muted" as const;
}

export default async function AnomaliesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const status = params.status === "ALL" || params.status === "RESOLVED" ? params.status : "OPEN";
  const search = params.q?.trim() ?? "";
  const [session, anomalies] = await Promise.all([getCurrentSession(), listAnomalyFlags(status, search)]);
  if (!session) {
    return null;
  }

  return (
    <PageShell
      title="Anomaly queue"
      description="Open anomaly flags highlight fingerprint drift, suspicious reuse, and other device-state mismatches that deserve operator review."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild variant={status === "OPEN" ? "default" : "outline"} size="sm">
          <Link href="/anomalies?status=OPEN">Open</Link>
        </Button>
        <Button asChild variant={status === "RESOLVED" ? "default" : "outline"} size="sm">
          <Link href="/anomalies?status=RESOLVED">Resolved</Link>
        </Button>
        <Button asChild variant={status === "ALL" ? "default" : "outline"} size="sm">
          <Link href="/anomalies?status=ALL">All</Link>
        </Button>
        {search ? <div className="text-xs text-zinc-400">Search: {search}</div> : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Severity</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {anomalies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                {status === "OPEN" ? "No open anomaly flags. All clear." : "No anomaly flags match this filter."}
              </TableCell>
            </TableRow>
          ) : (
            anomalies.map((flag, index) => {
              const summary = (flag.deviceSummary ?? {}) as Record<string, string | undefined>;
              return (
                <TableRow
                  key={flag.id}
                  className="animate-row-enter"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={severityVariant(flag.severity)}>{flag.severity}</Badge>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{flag.type}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[28rem]">
                    <div className="font-medium text-white">{flag.summary}</div>
                    <div className="text-xs text-zinc-400">{flag.macHash ?? "Unknown MAC-bound device"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-white">{summary.model ?? "Unknown device"}</div>
                    <div className="text-xs text-zinc-400">{flag.currentPackageName ?? "No current package"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={flag.status === "OPEN" ? "warning" : "muted"}>{flag.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(flag.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {flag.status === "OPEN" ? <ResolveAnomalyForm anomalyId={flag.id} csrfToken={session.csrfToken} /> : null}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </PageShell>
  );
}

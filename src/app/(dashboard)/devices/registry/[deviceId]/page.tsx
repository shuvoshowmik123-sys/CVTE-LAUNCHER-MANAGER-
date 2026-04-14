import Link from "next/link";

import { DeviceNoteForm } from "@/components/dashboard/device-note-form";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentSession } from "@/lib/auth/session";
import { getDeviceDetail } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeviceDetailPage({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  const [detail, session] = await Promise.all([getDeviceDetail(deviceId), getCurrentSession()]);
  const summary = detail.device.deviceSummary as Record<string, string | undefined>;

  return (
    <div className="space-y-6">
      <PageShell
        title={summary.model ?? "Device history"}
        description={`MAC-bound device record ${detail.device.macHash}`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Status</div>
            <div className="mt-2"><Badge>{detail.device.status}</Badge></div>
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">Package</div>
            <div className="mt-2 text-white">{detail.device.currentPackageName ?? "Unknown package"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Last seen</div>
            <div className="mt-2 text-white">{formatDateTime(detail.device.lastSeenAt)}</div>
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">Primary MAC</div>
            <div className="mt-2 font-mono text-[11px] text-zinc-200">{detail.device.primaryMac}</div>
          </div>
        </div>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/devices/registry">Back to registry</Link>
          </Button>
        </div>
      </PageShell>

      <PageShell title="Activation requests" description="Recent requests tied to this device record.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-[11px] text-zinc-300">{request.id}</TableCell>
                <TableCell><Badge>{request.status}</Badge></TableCell>
                <TableCell>{request.packageName}</TableCell>
                <TableCell>{formatDateTime(request.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PageShell>

      <PageShell title="Licenses" description="All issued licenses for this device.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>License</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.licenses.map((license) => (
              <TableRow key={license.id}>
                <TableCell className="font-mono text-[11px] text-zinc-300">{license.id}</TableCell>
                <TableCell><Badge>{license.status}</Badge></TableCell>
                <TableCell>{formatDateTime(license.issuedAt)}</TableCell>
                <TableCell>{formatDateTime(license.expiresAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PageShell>

      <PageShell title="Anomalies" description="Open and resolved anomaly history for this device.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.anomalies.map((flag) => (
              <TableRow key={flag.id}>
                <TableCell><Badge>{flag.severity}</Badge></TableCell>
                <TableCell>{flag.summary}</TableCell>
                <TableCell><Badge variant={flag.status === "OPEN" ? "warning" : "muted"}>{flag.status}</Badge></TableCell>
                <TableCell>{formatDateTime(flag.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PageShell>

      <PageShell title="Device notes" description="Internal notes stay attached to the device record for future review.">
        {session ? <DeviceNoteForm deviceId={deviceId} csrfToken={session.csrfToken} /> : null}
        <div className="mt-4 space-y-3">
          {detail.notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">{formatDateTime(note.createdAt)}</div>
              <div className="mt-2 whitespace-pre-wrap text-zinc-100">{note.note}</div>
            </div>
          ))}
          {detail.notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-zinc-500">
              No notes recorded for this device yet.
            </div>
          ) : null}
        </div>
      </PageShell>
    </div>
  );
}

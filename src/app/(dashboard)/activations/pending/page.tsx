import { ActionButton } from "@/components/dashboard/action-button";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentSession } from "@/lib/auth/session";
import { listActivationRequests } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PendingActivationsPage() {
  const [session, requests] = await Promise.all([
    getCurrentSession(),
    listActivationRequests("PENDING"),
  ]);

  if (!session) {
    return null;
  }

  return (
    <PageShell
      title="Pending activation requests"
      description="Review the device fingerprint summary before issuing an offline activation certificate."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Device hash</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const summary = request.deviceSummary as Record<string, string | undefined>;
            return (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="font-medium text-white">{request.customerLabel ?? summary.model ?? "Unlabeled device"}</div>
                  <div className="text-xs text-zinc-400">
                    {summary.manufacturer ?? "Unknown"} · {summary.board ?? "Unknown board"}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{request.deviceHash}</TableCell>
                <TableCell>{request.packageName}</TableCell>
                <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant="warning">{request.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      url={`/api/admin/activations/${request.id}/approve`}
                      csrfToken={session.csrfToken}
                      body={{ features: ["activation", "offline-license"] }}
                      label="Approve"
                    />
                    <ActionButton
                      url={`/api/admin/activations/${request.id}/reject`}
                      csrfToken={session.csrfToken}
                      body={{ note: "Activation rejected by operator" }}
                      label="Reject"
                      variant="outline"
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PageShell>
  );
}

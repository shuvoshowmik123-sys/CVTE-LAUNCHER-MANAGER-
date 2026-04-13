import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAuditEntries } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = await listAuditEntries();

  return (
    <PageShell
      title="Audit log"
      description="Authentication, approvals, revocations, and security-setting changes are recorded here for operational review."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium text-white">{entry.action}</TableCell>
              <TableCell>{entry.actorEmail ?? "System"}</TableCell>
              <TableCell>
                <div>{entry.targetType}</div>
                <div className="text-xs text-zinc-500">{entry.targetId ?? "—"}</div>
              </TableCell>
              <TableCell>{entry.actorRole ? <Badge variant="muted">{entry.actorRole}</Badge> : "—"}</TableCell>
              <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageShell>
  );
}

import Link from "next/link";

import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listLicenses } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RevokedDevicesPage() {
  const licenses = await listLicenses("REVOKED");

  return (
    <PageShell
      title="Revoked devices"
      description="Revoked licenses remain visible for support follow-up, forensic review, and later re-approval if needed."
    >
      <div className="mb-4 flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/api/admin/licenses/export?status=revoked">Export revoked devices CSV</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Revoked</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licenses.map((license) => {
            const summary = license.deviceSummary as Record<string, string | undefined>;
            return (
              <TableRow key={license.id}>
                <TableCell>
                  <div className="font-medium text-white">{license.customerLabel ?? summary.model ?? "Revoked device"}</div>
                  <div className="text-xs text-zinc-400">{license.deviceHash}</div>
                </TableCell>
                <TableCell>{license.packageName}</TableCell>
                <TableCell>{license.revokedAt ? formatDateTime(license.revokedAt) : "—"}</TableCell>
                <TableCell>{formatDateTime(license.expiresAt)}</TableCell>
                <TableCell>
                  <Badge variant="destructive">{license.status}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PageShell>
  );
}

import Link from "next/link";

import { ActionButton } from "@/components/dashboard/action-button";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentSession } from "@/lib/auth/session";
import { listLicenses } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApprovedDevicesPage() {
  const [session, licenses] = await Promise.all([getCurrentSession(), listLicenses("ACTIVE")]);
  if (!session) {
    return null;
  }

  return (
    <PageShell
      title="Approved devices"
      description="Active device licenses are stored with server-side revocation and operator-controlled reissue."
    >
      <div className="mb-4 flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/api/admin/licenses/export">Export active devices CSV</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licenses.map((license) => {
            const summary = license.deviceSummary as Record<string, string | undefined>;
            return (
              <TableRow key={license.id}>
                <TableCell>
                  <div className="font-medium text-white">{license.customerLabel ?? summary.model ?? "Approved device"}</div>
                  <div className="text-xs text-zinc-400">{license.deviceHash}</div>
                </TableCell>
                <TableCell>{license.packageName}</TableCell>
                <TableCell>{formatDateTime(license.issuedAt)}</TableCell>
                <TableCell>{formatDateTime(license.expiresAt)}</TableCell>
                <TableCell>
                  <Badge>{license.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      url={`/api/admin/licenses/${license.id}/reissue`}
                      csrfToken={session.csrfToken}
                      body={{ note: "Manual reissue from operator console" }}
                      label="Reissue"
                      variant="secondary"
                    />
                    <ActionButton
                      url={`/api/admin/licenses/${license.id}/revoke`}
                      csrfToken={session.csrfToken}
                      body={{ note: "Revoked from operator console" }}
                      label="Revoke"
                      variant="destructive"
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

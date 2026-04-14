import Link from "next/link";

import { ActionButton } from "@/components/dashboard/action-button";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentSession } from "@/lib/auth/session";
import { listDeviceRegistry } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  if (status === "BLOCKED" || status === "REVOKED") {
    return "destructive" as const;
  }
  if (status === "PENDING" || status === "INACTIVE") {
    return "warning" as const;
  }
  return "default" as const;
}

export default async function DeviceRegistryPage() {
  const [session, devices] = await Promise.all([getCurrentSession(), listDeviceRegistry()]);
  if (!session) {
    return null;
  }

  return (
    <PageShell
      title="Device registry"
      description="MAC-bound device records let us track real hardware identity, review lifecycle state, and control rebind behavior."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>MAC hash</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Last seen</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => {
            const summary = device.deviceSummary as Record<string, string | undefined>;
            return (
              <TableRow key={device.id}>
                <TableCell>
                  <div className="font-medium text-white">
                    <Link href={`/devices/registry/${device.id}`} className="hover:text-emerald-200">
                      {summary.model ?? "Registered device"}
                    </Link>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {summary.manufacturer ?? "Unknown vendor"} | {summary.board ?? "Unknown board"}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-[11px] text-zinc-300">{device.macHash}</TableCell>
                <TableCell>{device.currentPackageName ?? "Unknown package"}</TableCell>
                <TableCell>{formatDateTime(device.lastSeenAt)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(device.status)}>{device.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      url={`/api/admin/devices/${device.id}/unbind`}
                      csrfToken={session.csrfToken}
                      body={{ reason: "Manual unbind from device registry" }}
                      label="Unbind"
                      variant="outline"
                    />
                    {device.status === "INACTIVE" || device.status === "REVOKED" ? (
                      <ActionButton
                        url={`/api/admin/devices/${device.id}/rebind`}
                        csrfToken={session.csrfToken}
                        body={{ reason: "Operator approved a fresh rebind request for this device." }}
                        label="Allow Rebind"
                        variant="secondary"
                      />
                    ) : null}
                    <ActionButton
                      url={`/api/admin/devices/${device.id}/block`}
                      csrfToken={session.csrfToken}
                      body={{ reason: "Device blocked from registry console" }}
                      label="Block"
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

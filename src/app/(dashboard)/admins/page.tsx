import { redirect } from "next/navigation";

import { ActionButton } from "@/components/dashboard/action-button";
import { CreateAdminDialog } from "@/components/dashboard/create-admin-dialog";
import { PageShell } from "@/components/dashboard/page-shell";
import { ResetPasswordButton } from "@/components/dashboard/reset-password-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentSession } from "@/lib/auth/session";
import { listAdmins } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const [session, admins] = await Promise.all([getCurrentSession(), listAdmins()]);
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <PageShell
      title="Admin accounts"
      description="Only super admins can issue operator credentials, rotate passwords, and disable access."
    >
      <div className="mb-4 flex justify-end">
        <CreateAdminDialog csrfToken={session.csrfToken} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                No admin accounts configured.
              </TableCell>
            </TableRow>
          ) : (
            admins.map((admin, index) => (
              <TableRow
                key={admin.id}
                className="animate-row-enter"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <TableCell className="font-medium text-white">{admin.name}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <Badge variant={admin.role === "SUPER_ADMIN" ? "default" : "muted"}>
                    {admin.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={admin.status === "ACTIVE" ? "default" : "destructive"}>{admin.status}</Badge>
                </TableCell>
                <TableCell>{formatDateTime(admin.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ResetPasswordButton userId={admin.id} csrfToken={session.csrfToken} />
                    {admin.id !== session.userId ? (
                      <ActionButton
                        url={`/api/admin/admins/${admin.id}/disable`}
                        csrfToken={session.csrfToken}
                        body={{ reason: "Access disabled by super admin" }}
                        label="Disable"
                        variant="destructive"
                      />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PageShell>
  );
}

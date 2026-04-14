import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout
      session={{
        name: session.name,
        email: session.email,
        role: session.role,
        forcePasswordReset: session.forcePasswordReset,
        csrfToken: session.csrfToken,
      }}
    >
      {children}
    </DashboardLayout>
  );
}

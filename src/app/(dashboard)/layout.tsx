import { redirect } from "next/navigation";

import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardChrome
      session={{
        name: session.name,
        email: session.email,
        role: session.role,
        forcePasswordReset: session.forcePasswordReset,
        csrfToken: session.csrfToken,
      }}
    >
      {children}
    </DashboardChrome>
  );
}

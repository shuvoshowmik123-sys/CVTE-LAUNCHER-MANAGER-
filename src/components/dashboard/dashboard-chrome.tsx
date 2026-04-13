"use client";

import { usePathname } from "next/navigation";

import { PasswordResetBanner } from "@/components/dashboard/password-reset-banner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

type Props = {
  session: {
    name: string;
    email: string;
    role: "SUPER_ADMIN" | "ADMIN";
    forcePasswordReset: boolean;
    csrfToken: string;
  };
  children: React.ReactNode;
};

export function DashboardChrome({ session, children }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar pathname={pathname} role={session.role} />
        <div className="glass-panel rounded-[2rem] border border-white/10 px-5 py-5 shadow-2xl shadow-black/20 md:px-8 md:py-7">
          <div className="space-y-6">
            <Topbar
              name={session.name}
              email={session.email}
              role={session.role}
              csrfToken={session.csrfToken}
            />
            {session.forcePasswordReset ? <PasswordResetBanner csrfToken={session.csrfToken} /> : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

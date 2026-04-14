import Link from "next/link";
import { AlertTriangle, Cpu, ShieldCheck, KeySquare, LayoutDashboard, ScrollText, Settings2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/validators/schemas";
import { ROLE_ROUTES } from "@/lib/auth/permissions";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/activations/pending", label: "Pending", icon: KeySquare },
  { href: "/devices/registry", label: "Registry", icon: Cpu },
  { href: "/devices/approved", label: "Approved", icon: ShieldCheck },
  { href: "/devices/revoked", label: "Revoked", icon: ShieldCheck },
  { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { href: "/admins", label: "Admins", icon: Users, superOnly: true },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings2, superOnly: true },
];

export function Sidebar({
  pathname,
  role,
}: {
  pathname: string;
  role: UserRole;
}) {
  return (
    <aside className="flex h-full w-full max-w-xs flex-col rounded-[2rem] border border-white/10 bg-zinc-950/90 p-6">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Launcher Manager
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Activation Control</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Secure device approvals, offline licensing, and operator access from one place.
        </p>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          if (item.superOnly && role !== "SUPER_ADMIN") {
            return null;
          }

          if (!ROLE_ROUTES[role].some((route) => item.href === route || item.href.startsWith(route))) {
            return null;
          }

          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors",
                active
                  ? "border-emerald-300/25 bg-emerald-400/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.superOnly ? (
                <Badge variant={active ? "default" : "warning"} className="border-none">
                  Super
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

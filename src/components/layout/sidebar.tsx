"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Cpu,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Users,
  ScrollText,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/validators/schemas";
import { ROLE_ROUTES } from "@/lib/auth/permissions";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Devices",
    items: [
      { href: "/devices/registry", label: "Registry", icon: Cpu },
      { href: "/devices/approved", label: "Approved", icon: ShieldCheck },
      { href: "/devices/revoked", label: "Revoked", icon: ShieldCheck },
      { href: "/activations/pending", label: "Pending", icon: Clock },
      { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
    ],
  },
  {
    label: "Access",
    items: [
      { href: "/admins", label: "Admins", icon: Users, superOnly: true },
      { href: "/audit", label: "Audit", icon: ScrollText },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings2, superOnly: true },
    ],
  },
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
      <nav className="flex-1 space-y-6">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.superOnly && role !== "SUPER_ADMIN") return false;
            return ROLE_ROUTES[role].some(
              (route) => item.href === route || item.href.startsWith(route)
            );
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                {group.label}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <li key={item.href} className="relative">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors",
                          isActive
                            ? "border-emerald-300/25 bg-emerald-400/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            : "border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {item.superOnly ? (
                          <Badge variant={isActive ? "default" : "warning"} className="border-none">
                            Super
                          </Badge>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "@/components/layout/sidebar";
import { PasswordResetBanner } from "@/components/dashboard/password-reset-banner";

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

export function DashboardLayout({ session, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "x-csrf-token": session.csrfToken,
      },
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#060816]">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar slide-in */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 h-full w-72 lg:hidden"
          >
            <Sidebar pathname={pathname} role={session.role} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top navigation bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#060816]/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <span className="font-[var(--font-display)] text-sm font-semibold tracking-tight text-white">
                Activation Control
              </span>
            </div>
          </div>

          {/* Center: search placeholder */}
          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search devices, activations, operators..."
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-12 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                readOnly
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right: notifications + user menu */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{session.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm text-zinc-300 md:inline">{session.name}</span>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-white">{session.name}</p>
                  <p className="text-xs text-zinc-500">{session.email}</p>
                  <Badge
                    variant={session.role === "SUPER_ADMIN" ? "default" : "muted"}
                    className="mt-1"
                  >
                    {session.role.replace("_", " ")}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-400"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)] w-72">
            <Sidebar pathname={pathname} role={session.role} />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
            <div className="glass-panel rounded-[2rem] border border-white/10 px-5 py-5 shadow-2xl shadow-black/20 md:px-8 md:py-7">
              <div className="space-y-6">
                {session.forcePasswordReset ? (
                  <PasswordResetBanner csrfToken={session.csrfToken} />
                ) : null}
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Toast container */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(10, 14, 28, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#f4f7fb",
            borderRadius: "16px",
          },
        }}
      />
    </div>
  );
}

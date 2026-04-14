# UX Overhaul Implementation Plan

> **Project:** Launcher Manager Activation Server — Frontend Redesign
> **Date:** 2026-04-14
> **Scope:** Complete frontend UX/UI overhaul. Backend APIs remain unchanged.
> **Goal:** Transform from static table-heavy dashboard into a professional, animated, logically organized control panel

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [New Information Architecture](#2-new-information-architecture)
3. [Layout System Overhaul](#3-layout-system-overhaul)
4. [Animation & Motion System](#4-animation--motion-system)
5. [Component Architecture](#5-component-architecture)
6. [Page-by-Page Redesign Specifications](#6-page-by-page-redesign-specifications)
7. [Implementation Phases](#7-implementation-phases)
8. [File Change Map](#8-file-change-map)
9. [Migration Strategy](#9-migration-strategy)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Design Principles

### 1.1 Core Rules

| Principle | Description |
|---|---|
| **Motion with purpose** | Every animation communicates state, not decoration |
| **Hierarchy first** | Important information is larger, brighter, and positioned prominently |
| **Feedback always** | Every user action gets visual confirmation within 200ms |
| **Progressive disclosure** | Show summary first, details on demand |
| **Consistent rhythm** | 8px spacing grid, 4px for fine adjustments |
| **Empty states guide** | Never show blank space; always explain what belongs there |
| **Mobile parity** | Every feature works on mobile, not just desktop |

### 1.2 Design Token Updates

**Current tokens are good but incomplete. Add:**

```css
:root {
  /* Existing — keep */
  --background: #060816;
  --foreground: #f4f7fb;
  --card: rgba(11, 16, 34, 0.82);
  --card-strong: rgba(10, 14, 28, 0.94);
  --border: rgba(255, 255, 255, 0.11);
  --muted: #94a3b8;
  --primary: #34d399;
  --primary-foreground: #02120b;
  --accent: #8b5cf6;
  --danger: #fb7185;

  /* NEW tokens */
  --success: #34d399;           /* Same as primary, explicit naming */
  --warning: #fbbf24;           /* Amber-400 */
  --info: #60a5fa;              /* Blue-400 */
  --surface-1: rgba(255, 255, 255, 0.03);
  --surface-2: rgba(255, 255, 255, 0.06);
  --surface-3: rgba(255, 255, 255, 0.10);
  --glow-primary: 0 0 40px -20px rgba(52, 211, 153, 0.15);
  --glow-danger: 0 0 40px -20px rgba(251, 113, 133, 0.15);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 12px 48px rgba(0, 0, 0, 0.5);
  --transition-fast: 150ms cubic-bezier(0.22, 1, 0.36, 1);
  --transition-base: 250ms cubic-bezier(0.22, 1, 0.36, 1);
  --transition-slow: 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

## 2. New Information Architecture

### 2.1 Navigation Restructure

**Current navigation (messy, illogical grouping):**
```
Dashboard
Pending
Approved
Revoked
Admins (Super only)
Audit
Settings (Super only)
```

**New navigation (logical grouping):**
```
┌─ OVERVIEW ─────────────────┐
│  Dashboard                  │
├─ DEVICES ──────────────────┤
│  All Devices                │  ← Merged approved + revoked + new registry
│  Pending Requests           │
│  Anomalies                  │  ← NEW: anomaly flags page
├─ ACCESS ───────────────────┤
│  Operators                  │  ← Renamed from "Admins"
│  Audit Log                  │
├─ SYSTEM ───────────────────┤
│  Settings                   │
│  API Keys                   │  ← NEW: for future device auth
└────────────────────────────┘
```

### 2.2 Route Map

| Old Route | New Route | Status |
|---|---|---|
| `/` | `/` | Keep (landing page redesign) |
| `/login` | `/login` | Keep (login page redesign) |
| `/dashboard` | `/dashboard` | Keep (complete redesign) |
| `/activations/pending` | `/devices/pending` | Move + redesign |
| `/devices/approved` | `/devices` | Move + redesign (becomes "All Devices") |
| `/devices/revoked` | *(removed)* | Merge into `/devices` with filter |
| `/admins` | `/access/operators` | Move + redesign |
| `/audit` | `/access/audit` | Move + redesign |
| `/settings` | `/system/settings` | Move + redesign |
| *(none)* | `/devices/anomalies` | NEW |
| *(none)* | `/system/api-keys` | NEW (placeholder for future) |

### 2.3 Content Hierarchy Per Page

Every page follows this structure:

```
┌─────────────────────────────────────────────────────────────┐
│  Page Header                                                 │
│  ├── Breadcrumb (if nested)                                 │
│  ├── Title + Description                                    │
│  └── Primary Actions (right-aligned)                        │
├─────────────────────────────────────────────────────────────┤
│  Summary Bar (optional)                                     │
│  ├── Key metrics for this page                              │
│  └── Quick filters                                          │
├─────────────────────────────────────────────────────────────┤
│  Main Content                                                │
│  ├── Primary data display (cards, table, chart, etc.)       │
│  └── Pagination / load more                                 │
├─────────────────────────────────────────────────────────────┤
│  Context Panel (optional, right sidebar or below)           │
│  ├── Related information                                    │
│  └── Secondary actions                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Layout System Overhaul

### 3.1 New Dashboard Chrome

**Current layout:** Fixed 280px sidebar + glass panel content area. Rigid.

**New layout:** Responsive 3-zone layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Top Navigation Bar (always visible)                                │
│  [☰] [Logo]  [Search...]                    [🔔 3] [👤 Admin ▼]    │
├──────────┬──────────────────────────────────────────────────────────┤
│          │                                                          │
│ Sidebar  │  Main Content Area                                      │
│ (collaps │                                                          │
│  ible)   │  ┌────────────────────────────────────────────────────┐  │
│          │  │  Page Header                                       │  │
│          │  ├────────────────────────────────────────────────────┤  │
│          │  │  Summary Bar                                       │  │
│          │  ├────────────────────────────────────────────────────┤  │
│          │  │                                                    │  │
│          │  │  Content                                           │  │
│          │  │                                                    │  │
│          │  └────────────────────────────────────────────────────┘  │
│          │                                                          │
├──────────┴──────────────────────────────────────────────────────────┤
│  Toast Container (bottom-right)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Top Navigation Bar

**New file:** `src/components/dashboard/top-nav.tsx`

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/dashboard/sidebar";

export function TopNav({
  session,
  pathname,
}: {
  session: { name: string; email: string; role: string };
  pathname: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <>
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

      {/* Top bar */}
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
              <span className="font-display text-sm font-semibold tracking-tight text-white">
                Activation Control
              </span>
            </div>
          </div>

          {/* Center: search */}
          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search devices, activations, operators... (⌘K)"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
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
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                3
              </span>
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10 text-sm font-medium text-emerald-300">
                  {session.name.charAt(0)}
                </div>
                <span className="hidden text-sm text-zinc-300 md:inline">{session.name}</span>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </Button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-xl"
                  >
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-white">{session.name}</p>
                      <p className="text-xs text-zinc-500">{session.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        {session.role}
                      </span>
                    </div>
                    <div className="my-1 h-px bg-white/10" />
                    <Button variant="ghost" size="sm" className="w-full justify-start text-rose-400">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
```

### 3.3 New Sidebar

**Redesigned with:**
- Grouped navigation sections
- Animated active indicator
- Collapse on tablet (icons only)
- Badge counts on nav items

```tsx
// src/components/dashboard/sidebar.tsx

"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Monitor,
  Clock,
  AlertTriangle,
  Users,
  ScrollText,
  Settings2,
  KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Devices",
    items: [
      { label: "All Devices", href: "/devices", icon: Monitor, badge: 147 },
      { label: "Pending Requests", href: "/devices/pending", icon: Clock, badge: 3 },
      { label: "Anomalies", href: "/devices/anomalies", icon: AlertTriangle, badge: 2 },
    ],
  },
  {
    label: "Access",
    items: [
      { label: "Operators", href: "/access/operators", icon: Users, superOnly: true },
      { label: "Audit Log", href: "/access/audit", icon: ScrollText },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/system/settings", icon: Settings2, superOnly: true },
      { label: "API Keys", href: "/system/api-keys", icon: KeyRound, superOnly: true },
    ],
  },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const isSuper = role === "SUPER_ADMIN";

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/10 bg-zinc-950/50 p-4">
      {/* Navigation groups */}
      <nav className="flex-1 space-y-6">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superOnly || isSuper
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                {group.label}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  return (
                    <li key={item.href} className="relative">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                          isActive
                            ? "bg-emerald-400/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-nav"
                            className="absolute inset-0 rounded-xl border border-emerald-400/20"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <Icon className="relative h-4 w-4" />
                        <span className="relative">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="relative ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] font-semibold text-emerald-300">
                            {item.badge}
                          </span>
                        )}
                        {item.superOnly && (
                          <span className="relative ml-auto rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                            Super
                          </span>
                        )}
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
```

### 3.4 New Dashboard Layout Shell

**New file:** `src/components/dashboard/dashboard-layout.tsx`

```tsx
"use client";

import { TopNav } from "./top-nav";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function DashboardLayout({
  children,
  session,
  pathname,
}: {
  children: React.ReactNode;
  session: { name: string; email: string; role: string };
  pathname: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#060816]">
      <TopNav session={session} pathname={pathname} />
      <div className="flex flex-1">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar role={session.role} />
        </div>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
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
```

---

## 4. Animation & Motion System

### 4.1 Install Dependencies

```bash
pnpm add framer-motion sonner clsx tailwind-merge
```

### 4.2 Animation Primitives

**New file:** `src/components/ui/motion.tsx`

```tsx
"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";

// Page entrance animation
export function PageEntrance({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// Staggered list container
export const StaggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

// Staggered list item
export const StaggerItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// Fade in from bottom
export function FadeUp({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// Scale on hover (for cards, buttons)
export function HoverScale({
  children,
  scale = 1.02,
}: {
  children: ReactNode;
  scale?: number;
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}

// Number counter animation
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {value.toLocaleString(undefined, { maximumFractionDigits: decimals })}
    </motion.span>
  );
}

// Status dot with pulse
export function StatusDot({ status }: { status: "active" | "inactive" | "blocked" | "pending" }) {
  const config = {
    active: { color: "bg-emerald-400", shadow: "shadow-emerald-400/50" },
    inactive: { color: "bg-amber-400", shadow: "shadow-amber-400/50" },
    blocked: { color: "bg-rose-400", shadow: "shadow-rose-400/50" },
    pending: { color: "bg-blue-400", shadow: "shadow-blue-400/50" },
  };

  const { color, shadow } = config[status];

  return (
    <span className="relative flex h-2.5 w-2.5">
      {(status === "active" || status === "pending") && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full shadow-sm ${color} ${shadow}`} />
    </span>
  );
}

// Skeleton loader
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/10 ${className || "h-4 w-32"}`}
    />
  );
}

// Empty state
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
```

### 4.3 Global CSS Animations

**Add to `src/app/globals.css`:**

```css
/* Animated background gradient */
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

html {
  background:
    radial-gradient(circle at 20% 20%, rgba(52, 211, 153, 0.08), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.06), transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.04), transparent 50%),
    linear-gradient(180deg, #060816 0%, #070b17 50%, #03050c 100%);
  background-size: 200% 200%;
  animation: gradient-shift 25s ease infinite;
}

/* Smooth scroll */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Selection */
::selection {
  background: rgba(52, 211, 153, 0.28);
  color: white;
}

/* Glass panel with hover glow */
.glass-panel {
  background: var(--card);
  backdrop-filter: blur(22px);
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
}

.glass-panel:hover {
  border-color: rgba(52, 211, 153, 0.15);
  box-shadow: var(--glow-primary);
}

/* Card hover lift */
.card-lift {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.card-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

/* Button press effect */
.btn-press:active {
  transform: scale(0.97);
}

/* Loading shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 5. Component Architecture

### 5.1 New Component Structure

```
src/components/
├── ui/                          # Primitive components (shadcn-style)
│   ├── button.tsx               # Keep, enhance with motion
│   ├── badge.tsx                # Keep, add variants
│   ├── card.tsx                 # Keep, add HoverScale wrapper
│   ├── dialog.tsx               # Keep, add AnimatePresence
│   ├── input.tsx                # Keep
│   ├── label.tsx                # Keep
│   ├── select.tsx               # Keep
│   ├── table.tsx                # Keep, add responsive variant
│   ├── separator.tsx            # Keep
│   ├── textarea.tsx             # Keep
│   ├── checkbox.tsx             # NEW
│   ├── dropdown-menu.tsx        # NEW
│   ├── toast.tsx                # NEW (sonner wrapper)
│   ├── skeleton.tsx             # NEW
│   ├── avatar.tsx               # NEW
│   ├── progress.tsx             # NEW
│   ├── tabs.tsx                 # NEW
│   ├── tooltip.tsx              # NEW
│   └── motion.tsx               # NEW (animation primitives)
├── layout/                      # Layout components (NEW directory)
│   ├── dashboard-layout.tsx     # NEW (replaces dashboard-chrome)
│   ├── top-nav.tsx              # NEW
│   ├── sidebar.tsx              # Rewrite
│   ├── page-header.tsx          # NEW
│   ├── summary-bar.tsx          # NEW
│   └── breadcrumbs.tsx          # NEW
├── dashboard/                   # Dashboard-specific components
│   ├── metric-card.tsx          # Rewrite with AnimatedNumber
│   ├── device-card.tsx          # NEW (replaces table rows)
│   ├── device-detail-drawer.tsx # NEW
│   ├── status-badge.tsx         # NEW (with StatusDot)
│   ├── empty-pending.tsx        # NEW
│   ├── empty-devices.tsx        # NEW
│   ├── activity-timeline.tsx    # NEW
│   ├── sparkline.tsx            # NEW
│   ├── action-button.tsx        # Enhance with toast
│   ├── create-operator-dialog.tsx # Rename from create-admin-dialog
│   ├── reset-password-button.tsx # Keep, enhance
│   ├── password-reset-banner.tsx # Keep, enhance
│   ├── settings-form.tsx        # Keep, enhance
│   └── command-palette.tsx      # NEW
└── providers/
    └── theme-provider.tsx       # Keep
```

### 5.2 Key New Components

#### Page Header

**New file:** `src/components/layout/page-header.tsx`

```tsx
"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Breadcrumbs } from "./breadcrumbs";

export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
}: {
  breadcrumbs?: Array<{ label: string; href: string }>;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </motion.div>
  );
}
```

#### Summary Bar

**New file:** `src/components/layout/summary-bar.tsx`

```tsx
"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

export function SummaryBar({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
    >
      {children}
    </motion.div>
  );
}

export function SummaryStat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number;
  trend?: { value: number; direction: "up" | "down" };
}) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
      {trend && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            trend.direction === "up"
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-rose-400/10 text-rose-300"
          }`}
        >
          {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
        </span>
      )}
    </div>
  );
}

export function SummaryDivider() {
  return <div className="h-8 w-px bg-white/10" />;
}

export function SummaryFilter({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex items-center gap-2">{children}</div>;
}
```

#### Device Card

**New file:** `src/components/dashboard/device-card.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import { MoreVertical, RefreshCw, Ban, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DeviceCardProps {
  id: string;
  macHash: string;
  manufacturer: string;
  model: string;
  packageName: string;
  status: "active" | "inactive" | "blocked" | "expiring";
  issuedAt: string;
  expiresAt: string;
  lastHeartbeat: string;
  onReissue?: () => void;
  onRevoke?: () => void;
  onView?: () => void;
}

export function DeviceCard({
  macHash,
  manufacturer,
  model,
  packageName,
  status,
  issuedAt,
  expiresAt,
  lastHeartbeat,
  onReissue,
  onRevoke,
  onView,
}: DeviceCardProps) {
  const statusLabels = {
    active: "Active",
    inactive: "Inactive",
    blocked: "Blocked",
    expiring: "Expiring Soon",
  };

  const daysRemaining = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="group glass-panel border-white/10 bg-white/[0.02] transition-all hover:border-emerald-400/20 hover:shadow-[0_8px_32px_-16px_rgba(16,185,129,0.2)]">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <StatusDot status={status} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">
                    {manufacturer} {model}
                  </h3>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                    {statusLabels[status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  MAC: {macHash.slice(0, 8)}... • {packageName}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReissue}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reissue License
                </DropdownMenuItem>
                <DropdownMenuItem className="text-rose-400" onClick={onRevoke}>
                  <Ban className="mr-2 h-4 w-4" />
                  Revoke
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
            <div>
              <p className="text-zinc-500">Issued</p>
              <p className="text-zinc-300">{issuedAt}</p>
            </div>
            <div>
              <p className="text-zinc-500">Expires</p>
              <p className={daysRemaining < 30 ? "text-amber-300" : "text-zinc-300"}>
                {expiresAt}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Remaining</p>
              <p className="text-zinc-300">{daysRemaining} days</p>
            </div>
            <div>
              <p className="text-zinc-500">Last Heartbeat</p>
              <p className="text-zinc-300">{lastHeartbeat}</p>
            </div>
          </div>

          {/* Expiry progress bar */}
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 365) * 100))}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  daysRemaining < 30
                    ? "bg-amber-400"
                    : daysRemaining < 90
                    ? "bg-blue-400"
                    : "bg-emerald-400"
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

#### Device Detail Drawer

**New file:** `src/components/dashboard/device-detail-drawer.tsx`

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/motion";

interface DeviceDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  device: {
    macHash: string;
    manufacturer: string;
    model: string;
    board: string;
    androidVersion: string;
    packageName: string;
    appVersion: string;
    status: string;
    issuedAt: string;
    issuedBy: string;
    expiresAt: string;
    daysRemaining: number;
    lastHeartbeat: string;
    activationCount: number;
    timeline: Array<{ date: string; event: string }>;
  };
}

export function DeviceDetailDrawer({ open, onClose, device }: DeviceDetailDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-lg border-l border-white/10 bg-zinc-950 shadow-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-white">Device Details</h2>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Identity */}
                <section className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Identity
                  </h3>
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">MAC Hash</span>
                      <span className="font-mono text-zinc-300">{device.macHash}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Device</span>
                      <span className="text-zinc-300">
                        {device.manufacturer} {device.model}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Board</span>
                      <span className="text-zinc-300">{device.board}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Android</span>
                      <span className="text-zinc-300">{device.androidVersion}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Package</span>
                      <span className="text-zinc-300">
                        {device.packageName} v{device.appVersion}
                      </span>
                    </div>
                  </div>
                </section>

                {/* License */}
                <section className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    License
                  </h3>
                  <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center gap-2">
                      <StatusDot status={device.status as any} />
                      <span className="text-sm font-medium text-white capitalize">
                        {device.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Issued</span>
                      <span className="text-zinc-300">
                        {device.issuedAt} by {device.issuedBy}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Expires</span>
                      <span className="text-zinc-300">{device.expiresAt}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Remaining</span>
                      <span className="text-zinc-300">{device.daysRemaining} days</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${Math.max(0, Math.min(100, (device.daysRemaining / 365) * 100))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Last Heartbeat</span>
                      <span className="text-zinc-300">{device.lastHeartbeat}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Activation Count</span>
                      <span className="text-zinc-300">{device.activationCount}</span>
                    </div>
                  </div>
                </section>

                {/* Timeline */}
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Timeline
                  </h3>
                  <div className="space-y-3">
                    {device.timeline.map((item, index) => (
                      <div key={index} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-emerald-400" />
                          {index < device.timeline.length - 1 && (
                            <div className="h-full w-px bg-white/10" />
                          )}
                        </div>
                        <div>
                          <p className="text-zinc-300">{item.event}</p>
                          <p className="text-xs text-zinc-500">{item.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Footer actions */}
              <div className="flex items-center gap-2 border-t border-white/10 px-6 py-4">
                <Button variant="default" size="sm" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reissue License
                </Button>
                <Button variant="destructive" size="sm" className="flex-1">
                  <Ban className="mr-2 h-4 w-4" />
                  Revoke
                </Button>
                <Button variant="outline" size="sm">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Block
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

#### Command Palette

**New file:** `src/components/dashboard/command-palette.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Monitor, Clock, Users, Settings2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const COMMANDS = [
  { label: "Go to Dashboard", href: "/dashboard", icon: Monitor, section: "Navigation" },
  { label: "View All Devices", href: "/devices", icon: Monitor, section: "Navigation" },
  { label: "View Pending Requests", href: "/devices/pending", icon: Clock, section: "Navigation" },
  { label: "View Anomalies", href: "/devices/anomalies", icon: Clock, section: "Navigation" },
  { label: "Manage Operators", href: "/access/operators", icon: Users, section: "Navigation" },
  { label: "View Audit Log", href: "/access/audit", icon: Users, section: "Navigation" },
  { label: "Open Settings", href: "/system/settings", icon: Settings2, section: "Navigation" },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Search className="h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search commands..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                autoFocus
              />
              <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
                ESC
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No results found.</p>
              ) : (
                filtered.map((cmd, index) => (
                  <button
                    key={cmd.href}
                    onClick={() => {
                      router.push(cmd.href);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <cmd.icon className="h-4 w-4 text-zinc-500" />
                    <span className="flex-1">{cmd.label}</span>
                    <ArrowRight className="h-4 w-4 text-zinc-600" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 6. Page-by-Page Redesign Specifications

### 6.1 Landing Page (`/`)

**Current:** Two-column hero + highlights section. Static.

**New design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo] Activation Control                           [Sign In]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│              Secure Device Activation Control                       │
│                                                                      │
│         Issue, manage, and revoke licenses for your                  │
│         deployed Android TV devices with full audit                  │
│         trail and hardware-bound security.                           │
│                                                                      │
│         [Open Dashboard]          [View Documentation]               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ Live Metrics ─────────────────────────────────────────────────┐  │
│  │  147 Active    •    3 Pending    •    8 Revoked    •    99.9%  │  │
│  │  Devices              Queue                    Licenses        │  │
│  │  Uptime                                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ How It Works ─────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  ① Device Registers     ② Admin Reviews     ③ License Issued   │  │
│  │     APK submits            Operator             Ed25519-signed   │  │
│  │     fingerprint            approves             token bound to   │  │
│  │     with MAC hash          request              device hardware  │  │
│  │                                                                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ Security Features ────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  🔐 Hardware Binding     🛡️ Tamper Detection     📊 Full Audit  │  │
│  │  Licenses bound to        APK verifies its       Every action    │  │
│  │  device MAC address       own signature and      logged with     │  │
│  │  and hardware fingerprint environment integrity  actor + timestamp│  │
│  │                                                                  │  │
│  │  ⚡ Self-Destruct        🔄 Key Rotation         🌐 Offline Mode │  │
│  │  App wipes itself if      Rotate signing keys    Licenses work   │  │
│  │  tampering detected       without downtime       without network │  │
│  │                                                                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Animation spec:**
- Hero text fades up on load (staggered: title → description → buttons)
- Live metrics count up from 0
- Feature cards fade in on scroll (use IntersectionObserver)
- Background gradient animates slowly

### 6.2 Login Page (`/login`)

**Current:** Two-column with info left, form right.

**New design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    [Logo] Activation Control                         │
│                                                                      │
│                                                                      │
│              ┌────────────────────────────────────┐                  │
│              │                                    │                  │
│              │   🔐 Operator Access               │                  │
│              │                                    │                  │
│              │   Sign in to manage device         │                  │
│              │   activations and licenses         │                  │
│              │                                    │                  │
│              │   Email [________________]         │                  │
│              │   Password [________________]      │                  │
│              │                                    │                  │
│              │   [Sign In]                        │                  │
│              │                                    │                  │
│              │   Secured by Ed25519 signing       │                  │
│              │   and Argon2id password hashing    │                  │
│              │                                    │                  │
│              └────────────────────────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Animation spec:**
- Login card scales up from 0.95 → 1 on load
- Input fields focus with emerald ring animation
- Error message slides down with shake animation
- Success redirects with fade-out

### 6.3 Dashboard (`/dashboard`)

**New design:** See Section 2.2 in the main spec. Full redesign with:
- Greeting + quick stats
- Activity timeline (mini bar chart)
- Recent activity feed + pending review cards
- System health panel

**Animation spec:**
- Stats cards stagger in (50ms delay each)
- Numbers count up
- Activity items fade in sequentially
- System health status dots pulse

### 6.4 All Devices (`/devices`)

**New design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Devices                                              [+ Export CSV] │
│  Manage all registered devices, licenses, and activations            │
├─────────────────────────────────────────────────────────────────────┤
│  147 devices  •  12 expiring in 30 days  •  2 anomalies              │
├─────────────────────────────────────────────────────────────────────┤
│  [🔍 Search...]  [Status: All ▼]  [View: Cards ▾]  [Sort: Last Seen▼]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Device Card 1]                                                     │
│  [Device Card 2]                                                     │
│  [Device Card 3]                                                     │
│  ...                                                                 │
│                                                                      │
│  [← Previous]  Page 1 of 15  [Next →]                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Toggle between card view and table view
- Filter by status (active, inactive, blocked, expiring)
- Sort by last seen, issued date, expiry date, manufacturer
- Bulk select with floating action bar
- Click card → detail drawer slides in from right

### 6.5 Pending Requests (`/devices/pending`)

**New design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Pending Requests                                                    │
│  Review and approve device activation requests                       │
├─────────────────────────────────────────────────────────────────────┤
│  3 requests awaiting review                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ Request Card ─────────────────────────────────────────────────┐  │
│  │  ⏳ Submitted 5 minutes ago                                     │  │
│  │  CVTE HiSilicon AN14 (board: mars)                              │  │
│  │  MAC: a3f2b1c4...  •  Package: com.cvte.tv.launcher v1.0.4     │  │
│  │  IP: 192.168.1.100                                              │  │
│  │                                                                  │  │
│  │  ⚠️ Previously activated on Jan 15, 2026 — unbound on Apr 10   │  │
│  │                                                                  │  │
│  │  [Approve]  [Reject]                                            │  │
│  │  Note: [________________________________________]               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Request Card ─────────────────────────────────────────────────┐  │
│  │  ⏳ Submitted 12 minutes ago                                    │  │
│  │  Generic Android TV                                             │  │
│  │  MAC: b1c4d7e9...  •  Package: com.example.launcher v2.1.0     │  │
│  │  IP: 10.0.0.55                                                  │  │
│  │                                                                  │  │
│  │  ✅ First-time registration                                     │  │
│  │                                                                  │  │
│  │  [Approve]  [Reject]                                            │  │
│  │  Note: [________________________________________]               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Empty state:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    🛡️                                                │
│                                                                      │
│                 All caught up                                        │
│                                                                      │
│    No pending activation requests. Devices that submit               │
│    fingerprints will appear here for review.                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Animation spec:**
- Request cards slide in from left (staggered)
- Approve/Reject buttons show loading state with spinner
- On success: card fades out, toast appears
- On reject: card fades to gray, then collapses

### 6.6 Anomalies (`/devices/anomalies`) — NEW PAGE

```
┌─────────────────────────────────────────────────────────────────────┐
│  Anomalies                                                           │
│  Security flags requiring investigation                              │
├─────────────────────────────────────────────────────────────────────┤
│  🔴 1 Critical  •  🟠 2 High  •  🟡 3 Medium  •  12 Resolved        │
├─────────────────────────────────────────────────────────────────────┤
│  [Severity: All ▼]  [Status: Open ▼]  [Type: All ▼]                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ Anomaly Card ─────────────────────────────────────────────────┐  │
│  │  🔴 CLONED LICENSE                              2 minutes ago   │  │
│  │  Same device fingerprint found on 3 different MAC addresses     │  │
│  │  Device: CVTE HiSilicon AN14                                    │  │
│  │  MACs: a3f2..., b1c4..., d7e9...                                │  │
│  │  [Investigate]  [Resolve]  [Block All]                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Anomaly Card ─────────────────────────────────────────────────┐  │
│  │  🟠 MULTI DEVICE HASH                           1 hour ago     │  │
│  │  Same MAC address with 5 different device fingerprints          │  │
│  │  MAC: a3f2b1c4...                                               │  │  │
│  │  [Investigate]  [Resolve]  [Block]                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.7 Operators (`/access/operators`)

**Current:** Table with name, email, role, status, actions.

**New design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Operators                                              [+ Add]      │
│  Manage admin accounts and access permissions                        │
├─────────────────────────────────────────────────────────────────────┤
│  4 operators  •  3 active  •  1 disabled                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ Operator Card ────────────────────────────────────────────────┐  │
│  │  [Avatar] John Doe                              🟢 Active       │  │
│  │           john@example.com                                      │  │
│  │           Super Admin                                           │  │
│  │           Last active: 2 minutes ago                            │  │
│  │           [Reset Password]  [Disable]                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Operator Card ────────────────────────────────────────────────┐  │
│  │  [Avatar] Jane Smith                          🔴 Disabled       │  │
│  │           jane@example.com                                      │  │
│  │           Admin                                                 │  │
│  │           Disabled on Mar 15 by john@example.com                │  │
│  │           [Re-enable]  [Delete]                                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.8 Audit Log (`/access/audit`)

**Current:** Raw table.

**New design:** Timeline view with filtering

```
┌─────────────────────────────────────────────────────────────────────┐
│  Audit Log                                                           │
│  Complete history of all system actions                              │
├─────────────────────────────────────────────────────────────────────┤
│  [🔍 Search...]  [Action: All ▼]  [Actor: All ▼]  [Date Range ▼]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Apr 14, 2026                                                        │
│  ├── 12:30  ✅  admin@example.com approved activation a3f2...       │
│  ├── 12:15  🔑  admin@example.com logged in from 192.168.1.1        │
│  ├── 11:45  🔄  System refreshed license for b1c4...                │
│  └── 10:00  🚫  admin@example.com revoked license d7e9...           │
│                                                                      │
│  Apr 13, 2026                                                        │
│  ├── 16:30  👤  admin@example.com created operator jane@example.com │
│  └── 09:00  ⚙️  admin@example.com updated security settings         │
│                                                                      │
│  [Load More]                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.9 Settings (`/system/settings`)

**Current:** Form + signing metadata card.

**New design:** Tabbed settings

```
┌─────────────────────────────────────────────────────────────────────┐
│  Settings                                                            │
│  Configure system security and behavior                              │
├─────────────────────────────────────────────────────────────────────┤
│  [General]  [Security]  [Signing]  [Notifications]                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ General Settings ─────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Issuer Name                                                     │  │
│  │  [Launcher Manager Activation              ]                    │  │
│  │                                                                  │  │
│  │  Token Validity (days)                                           │  │
│  │  [365                    ]                                       │  │
│  │                                                                  │  │
│  │  Renewal Window (days)                                           │  │
│  │  [30                     ]                                       │  │
│  │                                                                  │  │
│  │  [✓] Activation enabled                                          │  │
│  │  [✓] Allow admin approvals                                       │  │
│  │                                                                  │  │
│  │  [Save Changes]                                                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Days 1-2)

| Task | Files Changed | Hours |
|---|---|---|
| Install framer-motion, sonner | `package.json` | 0.5 |
| Update globals.css with new tokens + animations | `src/app/globals.css` | 1 |
| Create motion primitives | `src/components/ui/motion.tsx` | 2 |
| Create new UI primitives (checkbox, dropdown, avatar, progress, tabs, tooltip, skeleton) | `src/components/ui/*.tsx` | 3 |
| Create layout components (top-nav, sidebar, page-header, summary-bar, breadcrumbs) | `src/components/layout/*.tsx` | 4 |
| Create dashboard-layout shell | `src/components/dashboard/dashboard-layout.tsx` | 2 |
| Update root layout to use new shell | `src/app/(dashboard)/layout.tsx` | 1 |

**Total: ~13.5 hours**

### Phase 2: Core Pages (Days 3-5)

| Task | Files Changed | Hours |
|---|---|---|
| Redesign landing page | `src/app/page.tsx` | 3 |
| Redesign login page | `src/app/login/page.tsx` | 2 |
| Redesign dashboard page | `src/app/(dashboard)/dashboard/page.tsx` | 4 |
| Create device-card component | `src/components/dashboard/device-card.tsx` | 2 |
| Create device-detail-drawer | `src/components/dashboard/device-detail-drawer.tsx` | 3 |
| Redesign All Devices page | `src/app/(dashboard)/devices/page.tsx` | 3 |
| Redesign Pending Requests page | `src/app/(dashboard)/devices/pending/page.tsx` | 3 |
| Create empty state components | `src/components/dashboard/empty-*.tsx` | 2 |

**Total: ~22 hours**

### Phase 3: Remaining Pages (Days 6-7)

| Task | Files Changed | Hours |
|---|---|---|
| Create Anomalies page | `src/app/(dashboard)/devices/anomalies/page.tsx` | 4 |
| Redesign Operators page | `src/app/(dashboard)/access/operators/page.tsx` | 3 |
| Redesign Audit Log page | `src/app/(dashboard)/access/audit/page.tsx` | 3 |
| Redesign Settings page | `src/app/(dashboard)/system/settings/page.tsx` | 3 |
| Create command palette | `src/components/dashboard/command-palette.tsx` | 3 |
| Enhance action-button with toasts | `src/components/dashboard/action-button.tsx` | 2 |

**Total: ~18 hours**

### Phase 4: Polish & Responsive (Days 8-9)

| Task | Hours |
|---|---|
| Mobile responsive testing + fixes | 4 |
| Tablet responsive (collapsed sidebar) | 2 |
| Keyboard navigation (tab order, shortcuts) | 2 |
| Loading skeletons for all data-fetching pages | 3 |
| Toast notifications for all actions | 2 |
| Animation performance audit (reduce motion for prefers-reduced-motion) | 2 |

**Total: ~15 hours**

### Phase 5: Testing & Launch (Day 10)

| Task | Hours |
|---|---|
| Cross-browser testing (Chrome, Firefox, Safari, Edge) | 3 |
| Performance audit (Lighthouse scores) | 2 |
| Accessibility audit (axe DevTools) | 2 |
| Bug fixes | 3 |

**Total: ~10 hours**

### Summary

| Phase | Duration | Hours |
|---|---|---|
| Phase 1: Foundation | 2 days | 13.5 |
| Phase 2: Core Pages | 3 days | 22 |
| Phase 3: Remaining Pages | 2 days | 18 |
| Phase 4: Polish & Responsive | 2 days | 15 |
| Phase 5: Testing & Launch | 1 day | 10 |
| **Total** | **10 days** | **~78.5 hours** |

---

## 8. File Change Map

### Files to Create (NEW)

```
src/components/ui/
├── checkbox.tsx
├── dropdown-menu.tsx
├── avatar.tsx
├── progress.tsx
├── tabs.tsx
├── tooltip.tsx
├── skeleton.tsx
└── motion.tsx

src/components/layout/
├── dashboard-layout.tsx
├── top-nav.tsx
├── sidebar.tsx
├── page-header.tsx
├── summary-bar.tsx
└── breadcrumbs.tsx

src/components/dashboard/
├── device-card.tsx
├── device-detail-drawer.tsx
├── status-badge.tsx
├── empty-pending.tsx
├── empty-devices.tsx
├── activity-timeline.tsx
├── sparkline.tsx
├── command-palette.tsx
└── create-operator-dialog.tsx

src/app/(dashboard)/
├── devices/
│   ├── page.tsx                    (All Devices)
│   ├── pending/
│   │   └── page.tsx                (rewrite existing)
│   └── anomalies/
│       └── page.tsx                (NEW)
├── access/
│   ├── operators/
│   │   └── page.tsx                (move from /admins)
│   └── audit/
│       └── page.tsx                (move from /audit)
└── system/
    ├── settings/
    │   └── page.tsx                (move from /settings)
    └── api-keys/
        └── page.tsx                (NEW placeholder)
```

### Files to Rewrite

```
src/app/globals.css                 (add tokens, animations, scrollbar)
src/app/page.tsx                    (landing page redesign)
src/app/login/page.tsx              (login page redesign)
src/app/(dashboard)/layout.tsx      (use new DashboardLayout)
src/app/(dashboard)/dashboard/page.tsx  (complete redesign)
src/app/(dashboard)/devices/approved/page.tsx  (merge into /devices)
src/app/(dashboard)/devices/revoked/page.tsx   (delete, merge into /devices)
src/app/(dashboard)/admins/page.tsx            (move to /access/operators)
src/app/(dashboard)/audit/page.tsx             (move to /access/audit)
src/app/(dashboard)/settings/page.tsx          (move to /system/settings)

src/components/dashboard/
├── dashboard-chrome.tsx            (delete, replaced by dashboard-layout)
├── topbar.tsx                      (delete, replaced by top-nav)
├── sidebar.tsx                     (complete rewrite)
├── page-shell.tsx                  (delete, replaced by page-header)
├── metric-card.tsx                 (rewrite with AnimatedNumber)
├── action-button.tsx               (enhance with toasts)
├── create-admin-dialog.tsx         (rename to create-operator-dialog)
├── reset-password-button.tsx       (enhance)
├── password-reset-banner.tsx       (enhance)
└── settings-form.tsx               (enhance)
```

### Files to Keep Unchanged

```
src/app/layout.tsx                  (root layout — keep)
src/components/providers/theme-provider.tsx  (keep)
src/components/ui/button.tsx        (keep, minor enhancements)
src/components/ui/badge.tsx         (keep)
src/components/ui/card.tsx          (keep)
src/components/ui/dialog.tsx        (keep)
src/components/ui/input.tsx         (keep)
src/components/ui/label.tsx         (keep)
src/components/ui/select.tsx        (keep)
src/components/ui/table.tsx         (keep)
src/components/ui/separator.tsx     (keep)
src/components/ui/textarea.tsx      (keep)

src/lib/                            (all backend — keep unchanged)
src/app/api/                        (all API routes — keep unchanged)
```

---

## 9. Migration Strategy

### 9.1 Approach: Incremental Replacement

Do NOT rewrite everything at once. Use feature flags and gradual migration:

**Step 1:** Install dependencies, create new components, keep old pages working
**Step 2:** Replace landing + login pages first (lowest risk)
**Step 3:** Replace dashboard layout shell (top-nav + sidebar)
**Step 4:** Replace dashboard page
**Step 5:** Replace device pages one at a time
**Step 6:** Replace remaining pages
**Step 7:** Delete old components

### 9.2 Feature Flag Pattern

```tsx
// src/lib/flags.ts
export const FLAGS = {
  newDashboardLayout: true,
  newDeviceCards: true,
  newCommandPalette: true,
} as const;

// In layout:
{FLAGS.newDashboardLayout ? (
  <DashboardLayout session={session} pathname={pathname}>
    {children}
  </DashboardLayout>
) : (
  <DashboardChrome session={session} pathname={pathname}>
    {children}
  </DashboardChrome>
)}
```

### 9.3 Rollback Plan

If new UI causes issues:
1. Set feature flags to `false` in `src/lib/flags.ts`
2. Old components remain in codebase, just unused
3. No database changes required (backend untouched)
4. Deploy rollback in < 5 minutes

### 9.4 Git Branch Strategy

```
main
├── feat/ui-foundation          (Phase 1)
├── feat/ui-core-pages          (Phase 2)
├── feat/ui-remaining-pages     (Phase 3)
├── feat/ui-polish-responsive   (Phase 4)
└── feat/ui-testing-launch      (Phase 5)
```

Merge each phase into `main` after review. No phase blocks another.

---

## 10. Testing Checklist

### 10.1 Visual Testing

- [ ] All pages render correctly on 1920x1080
- [ ] All pages render correctly on 1366x768
- [ ] All pages render correctly on 768x1024 (tablet)
- [ ] All pages render correctly on 375x667 (mobile)
- [ ] Dark mode is consistent (no light mode leaks)
- [ ] Typography hierarchy is clear (headings > body > captions)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Animations are smooth (60fps, no jank)

### 10.2 Functional Testing

- [ ] All navigation links work
- [ ] Sidebar active state follows current page
- [ ] Search in top bar filters correctly
- [ ] Command palette opens with ⌘K / Ctrl+K
- [ ] Command palette closes with Escape
- [ ] Device detail drawer opens/closes smoothly
- [ ] Approve/Reject actions show loading state
- [ ] Toast notifications appear on success/error
- [ ] Empty states display when no data
- [ ] Pagination works on all list pages
- [ ] Export CSV downloads correctly
- [ ] Create operator dialog works
- [ ] Reset password flow works
- [ ] Settings form saves correctly
- [ ] Logout redirects to login

### 10.3 Animation Testing

- [ ] Page transitions fire on navigation
- [ ] Staggered lists animate in sequence
- [ ] Buttons scale on hover/press
- [ ] Numbers count up on dashboard
- [ ] Status dots pulse for active/pending
- [ ] Skeleton loaders display during fetch
- [ ] Drawer slides in/out smoothly
- [ ] Toast notifications slide in/out
- [ ] `prefers-reduced-motion` disables animations

### 10.4 Performance Testing

- [ ] Lighthouse Performance score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Total bundle size < 200KB (gzipped)
- [ ] No unnecessary re-renders (React DevTools)
- [ ] Images optimized (next/image where applicable)

### 10.5 Accessibility Testing

- [ ] All interactive elements keyboard accessible
- [ ] Focus order is logical
- [ ] Focus indicators visible (emerald ring)
- [ ] ARIA labels on icon-only buttons
- [ ] Screen reader announces page changes
- [ ] Color is not the only indicator (status has text too)
- [ ] Form inputs have associated labels
- [ ] Error messages announced to screen readers

---

## Appendix A: Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| `sm` | 640px | Mobile, single column, hamburger menu |
| `md` | 768px | Mobile landscape, search visible |
| `lg` | 1024px | Tablet, sidebar visible, cards in 2 columns |
| `xl` | 1280px | Desktop, sidebar visible, cards in 3 columns |
| `2xl` | 1536px | Large desktop, max-width container |

---

## Appendix B: Animation Timing Reference

| Animation | Duration | Easing | Use Case |
|---|---|---|---|
| Fast | 150ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Hover states, focus rings |
| Base | 250ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Page transitions, card entrances |
| Slow | 400ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Drawer open/close, modal transitions |
| Spring | dynamic | `stiffness: 300, damping: 30` | Active nav indicator, button press |
| Stagger | 50-60ms delay | — | List items, metric cards |

---

## Appendix C: Color Usage Guide

| Color | Hex | Usage |
|---|---|---|
| Emerald-400 | `#34d399` | Primary actions, active states, success |
| Violet-500 | `#8b5cf6` | Accent glows, secondary highlights |
| Rose-400 | `#fb7185` | Destructive actions, errors, revoked |
| Amber-400 | `#fbbf24` | Warnings, expiring soon, pending |
| Blue-400 | `#60a5fa` | Info, heartbeat, neutral states |
| Zinc-950 | `#09090b` | Card backgrounds |
| Zinc-500 | `#71717a` | Secondary text, labels |
| Zinc-400 | `#a1a1aa` | Descriptions, muted text |
| White/5-10 | `rgba(255,255,255,0.05-0.10)` | Surface layers, borders |

---

*Document ready for implementation. Each phase is independently deployable. Backend APIs require zero changes.*

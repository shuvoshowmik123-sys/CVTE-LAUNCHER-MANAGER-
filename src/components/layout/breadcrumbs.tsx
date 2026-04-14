"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-zinc-500" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-zinc-700">/</span>}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-zinc-300"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-zinc-300" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

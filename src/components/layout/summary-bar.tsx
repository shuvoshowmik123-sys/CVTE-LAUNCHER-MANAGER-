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
  return <div className="hidden h-8 w-px bg-white/10 sm:block" />;
}

export function SummaryFilter({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex items-center gap-2">{children}</div>;
}

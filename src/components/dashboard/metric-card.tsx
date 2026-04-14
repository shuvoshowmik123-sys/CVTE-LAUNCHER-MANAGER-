"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/motion";

export function MetricCard({
  title,
  value,
  icon,
  delay = 0,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 17 } }}
    >
      <Card className="glass-panel border-white/10 bg-white/5">
        <CardHeader className="flex-row items-start justify-between">
          <div className="space-y-2">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="text-4xl">
              {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
            </CardTitle>
          </div>
          <motion.div
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {icon}
          </motion.div>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400">
          Real-time snapshot from activation requests, licenses, and operator accounts.
        </CardContent>
      </Card>
    </motion.div>
  );
}

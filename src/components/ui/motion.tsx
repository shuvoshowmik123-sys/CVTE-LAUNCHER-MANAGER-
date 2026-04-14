"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

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

// Animated number counter
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}

// Animated card with spring hover
export function AnimatedCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 17 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Table row with stagger
export function AnimatedTableRow({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.1 + index * 0.05,
      }}
    >
      {children}
    </motion.tr>
  );
}

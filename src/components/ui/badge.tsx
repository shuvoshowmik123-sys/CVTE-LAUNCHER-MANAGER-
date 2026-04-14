"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] badge-transition",
  {
    variants: {
      variant: {
        default: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
        warning: "border-amber-300/30 bg-amber-400/10 text-amber-200",
        destructive: "border-rose-300/30 bg-rose-500/10 text-rose-200",
        muted: "border-white/10 bg-white/5 text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <motion.span
      className={cn(badgeVariants({ variant }), className)}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.span>)}
    />
  );
}

export { badgeVariants };

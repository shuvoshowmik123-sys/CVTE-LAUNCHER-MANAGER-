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
          <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-white md:text-3xl">
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

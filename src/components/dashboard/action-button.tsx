"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ActionButton({
  url,
  csrfToken,
  body,
  label,
  variant = "default",
}: {
  url: string;
  csrfToken: string;
  body?: Record<string, unknown>;
  label: string;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  async function handleClick() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(body ?? {}),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setResult("error");
        toast.error(payload?.error ?? "Action failed.");
        return;
      }
      setResult("success");
      toast.success(`${label} completed successfully.`);
      router.refresh();
    } finally {
      setTimeout(() => {
        setPending(false);
        setResult(null);
      }, 1500);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant={variant} size="sm" onClick={handleClick} disabled={pending || result !== null} className="min-w-[72px]">
        <AnimatePresence mode="wait">
          {pending ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Working</span>
            </motion.div>
          ) : result === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Done</span>
            </motion.div>
          ) : result === "error" ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Failed</span>
            </motion.div>
          ) : (
            <motion.span
              key="label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </div>
  );
}

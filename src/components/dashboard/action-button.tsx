"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
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
        setError(payload?.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant={variant} size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Working..." : label}
      </Button>
      {error ? <p className="text-right text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}

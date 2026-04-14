"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ResolveAnomalyForm({ anomalyId, csrfToken }: { anomalyId: string; csrfToken: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Resolution note"
        className="min-h-20 min-w-56 text-xs"
      />
      {error ? <div className="text-xs text-rose-300">{error}</div> : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const response = await fetch(`/api/admin/anomalies/${anomalyId}/resolve`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-csrf-token": csrfToken,
                },
                body: JSON.stringify({ note: note.trim() || "Resolved from anomaly console" }),
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                setError(data.message ?? "Could not resolve anomaly.");
                return;
              }
              router.refresh();
            } catch {
              setError("Could not resolve anomaly.");
            }
          });
        }}
      >
        {isPending ? "Resolving..." : "Resolve"}
      </Button>
    </div>
  );
}

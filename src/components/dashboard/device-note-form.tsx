"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function DeviceNoteForm({ deviceId, csrfToken }: { deviceId: string; csrfToken: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div>
        <div className="text-sm font-medium text-white">Add device note</div>
        <div className="text-xs text-zinc-400">Internal note for support, activation review, or customer handling.</div>
      </div>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Write an internal note for this device..."
        className="min-h-28"
      />
      {error ? <div className="text-xs text-rose-300">{error}</div> : null}
      <Button
        type="button"
        disabled={isPending || note.trim().length < 3}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const response = await fetch(`/api/admin/devices/${deviceId}/notes`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-csrf-token": csrfToken,
                },
                body: JSON.stringify({ note }),
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                setError(data.message ?? "Could not save the note.");
                return;
              }
              setNote("");
              router.refresh();
            } catch {
              setError("Could not save the note.");
            }
          });
        }}
      >
        {isPending ? "Saving..." : "Save Note"}
      </Button>
    </div>
  );
}

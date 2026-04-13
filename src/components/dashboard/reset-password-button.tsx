"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ResetPasswordButton({
  userId,
  csrfToken,
}: {
  userId: string;
  csrfToken: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  async function handleReset() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/admins/${userId}/reset-password`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ reason: "Operator password reset from admin console" }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Password reset failed.");
        return;
      }

      setTemporaryPassword(payload.temporaryPassword ?? null);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset operator password</DialogTitle>
          <DialogDescription>
            This generates a temporary password and forces the admin to rotate it on next sign-in.
          </DialogDescription>
        </DialogHeader>
        {temporaryPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">Share this temporary password securely. It will not be shown again.</p>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 font-mono text-sm text-emerald-100">
              {temporaryPassword}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setTemporaryPassword(null);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Confirm this reset only if you are ready to deliver the new temporary password securely.
            </p>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <div className="flex gap-3">
              <Button onClick={handleReset} disabled={pending}>
                {pending ? "Resetting..." : "Generate temporary password"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordResetBanner({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Password update failed.");
        return;
      }
      setMessage("Password updated. Your session has been refreshed.");
      setPassword("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-amber-300/20 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-amber-100">Password rotation required</CardTitle>
        <CardDescription className="text-amber-200/80">
          This account was created or reset with a temporary password. Set a new password before doing admin work.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 12 characters"
              required
            />
          </div>
          <Button type="submit" disabled={pending || password.length < 12}>
            {pending ? "Updating..." : "Rotate password"}
          </Button>
        </form>
        {message ? <p className="mt-3 text-sm text-amber-100">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

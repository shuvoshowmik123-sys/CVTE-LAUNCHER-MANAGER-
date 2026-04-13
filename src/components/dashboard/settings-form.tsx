"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsShape = {
  issuer: string;
  tokenValidityDays: number;
  renewalWindowDays: number;
  activationEnabled: boolean;
  allowAdminApprovals: boolean;
};

export function SettingsForm({
  csrfToken,
  initialSettings,
}: {
  csrfToken: string;
  initialSettings: SettingsShape;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialSettings);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Settings update failed.");
        return;
      }
      setForm(data.settings);
      setMessage("Security settings updated.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="issuer">Issuer</Label>
        <Input id="issuer" value={form.issuer} onChange={(event) => setForm((prev) => ({ ...prev, issuer: event.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="validity">Token validity (days)</Label>
        <Input
          id="validity"
          type="number"
          value={form.tokenValidityDays}
          onChange={(event) => setForm((prev) => ({ ...prev, tokenValidityDays: Number(event.target.value) }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="renewal">Renewal window (days)</Label>
        <Input
          id="renewal"
          type="number"
          value={form.renewalWindowDays}
          onChange={(event) => setForm((prev) => ({ ...prev, renewalWindowDays: Number(event.target.value) }))}
        />
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={form.activationEnabled}
          onChange={(event) => setForm((prev) => ({ ...prev, activationEnabled: event.target.checked }))}
        />
        Activation enabled
      </label>
      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={form.allowAdminApprovals}
          onChange={(event) => setForm((prev) => ({ ...prev, allowAdminApprovals: event.target.checked }))}
        />
        Allow admin approvals
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save settings"}
        </Button>
        {message ? <span className="text-sm text-zinc-400">{message}</span> : null}
      </div>
    </form>
  );
}

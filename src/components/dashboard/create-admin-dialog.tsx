"use client";

import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateAdminDialog({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SUPER_ADMIN" | "ADMIN">("ADMIN");
  const [pending, setPending] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to create admin.");
        return;
      }
      setTemporaryPassword(data.temporaryPassword);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create admin</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an admin account</DialogTitle>
          <DialogDescription>
            New admins receive a temporary password and must rotate it on first login.
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
                setName("");
                setEmail("");
                setRole("ADMIN");
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input id="admin-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as "SUPER_ADMIN" | "ADMIN")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create account"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

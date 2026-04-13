"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Topbar({
  name,
  email,
  role,
  csrfToken,
}: {
  name: string;
  email: string;
  role: string;
  csrfToken: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
      },
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm text-zinc-400">Signed activation operations stay server-controlled and auditable.</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">Operator Console</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium text-white">{name}</div>
          <div className="text-xs text-zinc-400">{email}</div>
        </div>
        <Badge variant={role === "SUPER_ADMIN" ? "default" : "muted"}>{role.replace("_", " ")}</Badge>
        <Button variant="outline" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

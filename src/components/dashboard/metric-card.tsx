import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <Card className="glass-panel border-white/10 bg-white/5">
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-2">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-4xl">{value}</CardTitle>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="text-sm text-zinc-400">
        Real-time snapshot from activation requests, licenses, and operator accounts.
      </CardContent>
    </Card>
  );
}

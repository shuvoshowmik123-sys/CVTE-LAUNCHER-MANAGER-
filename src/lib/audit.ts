import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import type { UserRole } from "@/lib/validators/schemas";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: UserRole | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
}

import { z } from "zod";

import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { resolveAnomalyFlag } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

const schema = z.object({
  note: z.string().trim().max(240).optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ anomalyId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return jsonError(401, "Authentication required");
    }
    const csrfOk = await verifyCsrfFromRequest(request, session.csrfToken);
    if (!csrfOk) {
      return jsonError(403, "CSRF validation failed");
    }

    const { anomalyId } = await context.params;
    const payload = schema.parse(await request.json());
    await resolveAnomalyFlag(anomalyId, payload.note);
    return Response.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

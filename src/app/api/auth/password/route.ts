import { z } from "zod";

import { jsonError, toHttpError } from "@/lib/http/errors";
import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { updateOwnPassword } from "@/lib/services/admin";

const schema = z.object({
  password: z.string().min(12),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return jsonError(401, "Authentication required");
    }

    const csrfOk = await verifyCsrfFromRequest(request, session.csrfToken);
    if (!csrfOk) {
      return jsonError(403, "CSRF validation failed");
    }

    const payload = schema.parse(await request.json());
    await updateOwnPassword(payload.password);
    return Response.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

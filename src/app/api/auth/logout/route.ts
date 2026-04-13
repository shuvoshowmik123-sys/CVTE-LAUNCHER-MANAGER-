import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { jsonError, toHttpError } from "@/lib/http/errors";
import { logoutAdmin } from "@/lib/services/admin";

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
    await logoutAdmin();
    return Response.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

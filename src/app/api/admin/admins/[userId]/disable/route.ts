import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { adminStatusUpdatePayloadSchema } from "@/lib/validators/schemas";
import { disableAdminAccount } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return jsonError(401, "Authentication required");
    }
    const csrfOk = await verifyCsrfFromRequest(request, session.csrfToken);
    if (!csrfOk) {
      return jsonError(403, "CSRF validation failed");
    }
    const { userId } = await context.params;
    const payload = adminStatusUpdatePayloadSchema.parse(await request.json());
    await disableAdminAccount(userId, payload);
    return Response.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { deviceRegistryActionPayloadSchema } from "@/lib/validators/schemas";
import { unbindDevice } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return jsonError(401, "Authentication required");
    }
    const csrfOk = await verifyCsrfFromRequest(request, session.csrfToken);
    if (!csrfOk) {
      return jsonError(403, "CSRF validation failed");
    }

    const { deviceId } = await context.params;
    const payload = deviceRegistryActionPayloadSchema.parse(await request.json());
    await unbindDevice(deviceId, payload);
    return Response.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

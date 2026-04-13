import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { settingsUpdatePayloadSchema } from "@/lib/validators/schemas";
import { getSecuritySettings, updateSecuritySettings } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getSecuritySettings();
    return Response.json({ settings });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return jsonError(401, "Authentication required");
    }
    const csrfOk = await verifyCsrfFromRequest(request, session.csrfToken);
    if (!csrfOk) {
      return jsonError(403, "CSRF validation failed");
    }
    const payload = settingsUpdatePayloadSchema.parse(await request.json());
    await updateSecuritySettings(payload);
    const settings = await getSecuritySettings();
    return Response.json({ settings });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

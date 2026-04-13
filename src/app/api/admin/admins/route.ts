import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { adminCreatePayloadSchema } from "@/lib/validators/schemas";
import { createAdminAccount, listAdmins } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await listAdmins();
    return Response.json({ rows });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

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
    const payload = adminCreatePayloadSchema.parse(await request.json());
    const result = await createAdminAccount(payload);
    return Response.json(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

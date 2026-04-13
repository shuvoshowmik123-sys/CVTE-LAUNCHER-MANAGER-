import { activationDecisionPayloadSchema } from "@/lib/validators/schemas";
import { getCurrentSession, verifyCsrfFromRequest } from "@/lib/auth/session";
import { jsonError, toHttpError } from "@/lib/http/errors";
import { approveActivationRequest } from "@/lib/services/admin";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return jsonError(401, "Authentication required");
    }
    const csrfOk = await verifyCsrfFromRequest(request, session.csrfToken);
    if (!csrfOk) {
      return jsonError(403, "CSRF validation failed");
    }
    const { requestId } = await context.params;
    const payload = activationDecisionPayloadSchema.parse(await request.json());
    const license = await approveActivationRequest(requestId, payload);
    return Response.json({ license });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

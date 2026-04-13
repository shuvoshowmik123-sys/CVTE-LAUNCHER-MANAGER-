import { adminLoginPayloadSchema } from "@/lib/validators/schemas";
import { jsonError, toHttpError } from "@/lib/http/errors";
import { loginAdmin } from "@/lib/services/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = adminLoginPayloadSchema.parse(await request.json());
    const result = await loginAdmin(payload.email, payload.password);
    return Response.json(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

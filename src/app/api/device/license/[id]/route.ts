import { jsonError, toHttpError } from "@/lib/http/errors";
import { getLicenseRecord } from "@/lib/services/admin";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const license = await getLicenseRecord(id);
    return Response.json({ license });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

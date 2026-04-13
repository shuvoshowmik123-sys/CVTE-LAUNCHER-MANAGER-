import { licenseRefreshPayloadSchema } from "@/lib/validators/schemas";
import { jsonError, toHttpError } from "@/lib/http/errors";
import { refreshLicense } from "@/lib/services/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = licenseRefreshPayloadSchema.parse(await request.json());
    const license = await refreshLicense(payload);
    return Response.json({ license });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

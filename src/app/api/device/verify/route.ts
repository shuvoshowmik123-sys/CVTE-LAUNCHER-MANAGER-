import { licenseVerifyPayloadSchema } from "@/lib/validators/schemas";
import { jsonError, toHttpError } from "@/lib/http/errors";
import { verifyDeviceLicense } from "@/lib/services/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = licenseVerifyPayloadSchema.parse(await request.json());
    const result = await verifyDeviceLicense(payload);
    return Response.json(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

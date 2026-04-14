import { anomalyStatusSchema } from "@/lib/validators/schemas";
import { listAnomalyFlags } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status");
    const status = rawStatus ? anomalyStatusSchema.parse(rawStatus) : "OPEN";
    const search = searchParams.get("search") ?? undefined;
    const rows = await listAnomalyFlags(status, search);
    return Response.json({ rows });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

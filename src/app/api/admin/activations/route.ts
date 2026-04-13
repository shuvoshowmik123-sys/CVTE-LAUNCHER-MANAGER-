import { listActivationRequests } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
    const search = searchParams.get("search") ?? undefined;
    const rows = await listActivationRequests(status, search);
    return Response.json({ rows });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

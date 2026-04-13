import { listLicenses, exportLicensesCsv } from "@/lib/services/admin";
import { jsonError, toHttpError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status")?.toUpperCase();
    const status = rawStatus === "REVOKED" ? "REVOKED" : "ACTIVE";
    await listLicenses(status);
    const csv = await exportLicensesCsv(status);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${status.toLowerCase()}-licenses.csv"`,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return jsonError(httpError.status, httpError.message, httpError.details);
  }
}

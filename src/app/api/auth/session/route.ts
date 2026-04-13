import { getCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  return Response.json({ session });
}

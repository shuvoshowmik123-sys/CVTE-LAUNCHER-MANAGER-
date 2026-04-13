export class HttpError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return Response.json({ error: message, details }, { status });
}

export function toHttpError(error: unknown) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return new HttpError(401, "Authentication required");
  }

  return new HttpError(500, "Unexpected server error");
}

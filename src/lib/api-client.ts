// Thin fetch wrapper shared by every TanStack Query hook in `src/hooks/queries.ts`.
//
// Contract:
//  - Adds `Content-Type: application/json` and JSON-stringifies `init.json` when provided.
//  - Parses the response body as JSON (when present) and returns it typed as `T`.
//  - A 204 No Content response resolves to `undefined as T` without attempting to parse a body.
//  - Non-2xx responses throw `ApiClientError` with `status` and a `message` read from the
//    API's `{ error: string }` envelope (see `src/lib/api-error.ts` on the server side).

export class ApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

function isErrorEnvelope(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  );
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const hasJsonBody = json !== undefined;

  const res = await fetch(path, {
    ...rest,
    headers: hasJsonBody ? { "Content-Type": "application/json", ...headers } : headers,
    ...(hasJsonBody ? { body: JSON.stringify(json) } : {}),
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    const message = isErrorEnvelope(data) ? data.error : res.statusText || `Request failed (${res.status})`;
    throw new ApiClientError(res.status, message);
  }

  return data as T;
}

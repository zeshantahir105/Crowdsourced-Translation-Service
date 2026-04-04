let warnedMissingApiUrl = false;

function base(): string {
  const raw = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (
    !warnedMissingApiUrl &&
    !raw &&
    typeof window !== "undefined" &&
    !/^localhost$|^127\.0\.0\.1$/i.test(window.location.hostname)
  ) {
    warnedMissingApiUrl = true;
    console.error(
      "[LingoHub] VITE_API_URL is not set. API calls go to this site and will fail. Add VITE_API_URL in Vercel (your Render API origin, no trailing slash)."
    );
  }
  return raw;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function getToken(): string | null {
  return localStorage.getItem("lh_token");
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem("lh_token", t);
  else localStorage.removeItem("lh_token");
}

function throwIfNotOk(res: Response, data: unknown) {
  if (res.ok) return;
  const errMsg = (data as { error?: string })?.error || res.statusText;
  const code = (data as { code?: string })?.code;
  throw new ApiError(errMsg, res.status, code);
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  throwIfNotOk(res, data);
  return data as T;
}

/** Multipart upload — do not set Content-Type (browser adds boundary). */
export async function apiFormData<T>(
  path: string,
  form: FormData,
  options?: { timeoutMs?: number }
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const timeoutMs = options?.timeoutMs ?? 15 * 60 * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(
        "Request timed out. Large PDFs can take several minutes — try again or use a smaller file.",
        408
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  throwIfNotOk(res, data);
  return data as T;
}

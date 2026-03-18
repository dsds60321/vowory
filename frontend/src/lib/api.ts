import { API_BASE_URL } from "@/lib/auth";

export type ApiErrorPayload = {
  status?: number;
  code?: string;
  message?: string;
  detailMessage?: string | null;
  clientAction?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detailMessage?: string;
  readonly clientAction?: string | null;
  readonly redirectedToLogin: boolean;

  constructor(payload: {
    status: number;
    code: string;
    message: string;
    detailMessage?: string | null;
    clientAction?: string | null;
    redirectedToLogin?: boolean;
  }) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.detailMessage = payload.detailMessage ?? undefined;
    this.clientAction = payload.clientAction;
    this.redirectedToLogin = payload.redirectedToLogin ?? false;
  }
}

const LOGIN_REDIRECT_ACTION = "CLEAR_SESSION_AND_REDIRECT_LOGIN";
const LOGIN_REDIRECT_CODES = new Set(["AUTH_REQUIRED", "SESSION_EXPIRED"]);

function toAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

async function parseErrorPayload(response: Response): Promise<ApiErrorPayload | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (!text.trim()) return null;
    return { message: text };
  }

  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
}

function shouldRedirectToLogin(payload: ApiErrorPayload | null, status: number): boolean {
  if (payload?.clientAction === LOGIN_REDIRECT_ACTION) {
    return true;
  }
  if (payload?.code && LOGIN_REDIRECT_CODES.has(payload.code)) {
    return true;
  }
  return status === 401;
}

async function clearSessionSilently(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.clear();
  }
}

function redirectToLoginIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.replace("/login");
}

function buildRequestHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? {});
  const hasBody = init?.body !== undefined && init.body !== null;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(toAbsoluteUrl(path), {
    ...init,
    credentials: "include",
    headers: buildRequestHeaders(init),
  });

  if (response.ok) {
    return response;
  }

  const payload = await parseErrorPayload(response);
  const redirectedToLogin = shouldRedirectToLogin(payload, response.status);

  if (redirectedToLogin) {
    await clearSessionSilently();
    redirectToLoginIfNeeded();
  }

  throw new ApiError({
    status: payload?.status ?? response.status,
    code: payload?.code ?? "HTTP_ERROR",
    message: payload?.message ?? "요청 처리 중 오류가 발생했습니다.",
    detailMessage: payload?.detailMessage,
    clientAction: payload?.clientAction,
    redirectedToLogin,
  });
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  const contentType = response.headers.get("content-type") ?? "";

  if (response.status === 204) {
    return undefined as T;
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function apiFetchRaw(path: string, init?: RequestInit): Promise<Response> {
  return request(path, init);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorMessage(error: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  if (error instanceof ApiError) {
    return error.detailMessage || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

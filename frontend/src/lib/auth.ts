export type AuthMeResponse = {
  loggedIn: boolean;
  userId?: string;
  name?: string;
  email?: string;
  provider?: string;
  role?: "USER" | "ADMIN";
  isAdmin?: boolean;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function oauthLoginUrl(provider: "google" | "kakao"): string {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return { loggedIn: false };
    }

    const data = (await response.json()) as AuthMeResponse;
    return {
      loggedIn: Boolean(data.loggedIn),
      userId: data.userId,
      name: data.name,
      email: data.email,
      provider: data.provider,
      role: data.role,
      isAdmin: Boolean(data.isAdmin),
    };
  } catch {
    return { loggedIn: false };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  } catch {
    // ignore network failures during logout action
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.clear();
  }
}

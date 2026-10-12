import { API_URL } from '../config/app';
import { useAuthStore } from '../store/authStore';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  auth?: boolean;
}

async function rawRequest(path: string, { method = 'GET', body, auth = true }: RequestOptions) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = useAuthStore.getState().accessToken;
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }
}

let refreshing: Promise<boolean> | null = null;

/** Rotates the refresh token. Concurrent callers share one in-flight refresh. */
function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const { refreshToken, setTokens, markSignedOut } = useAuthStore.getState();
    if (!refreshToken) return false;
    const res = await rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false });
    if (!res.ok) {
      markSignedOut();
      return false;
    }
    await setTokens(await res.json());
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function apiRequest<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options);
  if (res.status === 401 && options.auth !== false && (await refreshSession())) {
    res = await rawRequest(path, options);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN_ERROR');
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

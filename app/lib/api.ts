// Pick the API base URL based on where the code runs:
//  - On the server (loaders/actions) use the internal Docker DNS via
//    `STELLARPOD_API_URL` so Remix talks to the API container directly.
//  - In the browser, read `window.ENV.PUBLIC_API_URL` that the root loader
//    injects at render time (e.g. https://api.stelo.life).
declare global {
  interface Window {
    ENV?: { PUBLIC_API_URL?: string };
  }
}

function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.ENV?.PUBLIC_API_URL || "http://localhost:8000";
  }
  if (typeof process !== "undefined") {
    return (
      process.env.STELLARPOD_API_URL ||
      process.env.PUBLIC_API_URL ||
      "http://localhost:8000"
    );
  }
  return "http://localhost:8000";
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  walletAddress?: string;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function api<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    token,
    walletAddress,
    headers: customHeaders,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Dev mode bypass — auto-create a demo store in BE
    "X-Dev-Store": "demo-store",
    ...customHeaders,
  };

  if (walletAddress) {
    headers["X-Wallet-Address"] = walletAddress;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: (errorData as { message?: string }).message || `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json() as T;
    return { data, error: null, status: response.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error occurred",
      status: 0,
    };
  }
}

// Convenience methods. Pass the wallet address (from `requireUser`) so the
// API receives an `X-Wallet-Address` header — the backend can later be
// upgraded to require this for authenticated endpoints.
export const apiGet = <T>(endpoint: string, walletAddress?: string) =>
  api<T>(endpoint, { method: "GET", walletAddress });

export const apiPost = <T>(
  endpoint: string,
  body: unknown,
  walletAddress?: string,
) => api<T>(endpoint, { method: "POST", body, walletAddress });

export const apiPut = <T>(
  endpoint: string,
  body: unknown,
  walletAddress?: string,
) => api<T>(endpoint, { method: "PUT", body, walletAddress });

export const apiPatch = <T>(
  endpoint: string,
  body: unknown,
  walletAddress?: string,
) => api<T>(endpoint, { method: "PATCH", body, walletAddress });

export const apiDelete = <T>(endpoint: string, walletAddress?: string) =>
  api<T>(endpoint, { method: "DELETE", walletAddress });

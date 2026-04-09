const API_BASE_URL = typeof process !== "undefined"
  ? process.env.STELLARPOD_API_URL || "http://localhost:3000"
  : "http://localhost:3000";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
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
  const { method = "GET", body, token, headers: customHeaders } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Dev mode bypass — auto-create a demo store in BE
    "X-Dev-Store": "demo-store",
    ...customHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

// Convenience methods
export const apiGet = <T>(endpoint: string, token?: string) =>
  api<T>(endpoint, { method: "GET", token });

export const apiPost = <T>(endpoint: string, body: unknown, token?: string) =>
  api<T>(endpoint, { method: "POST", body, token });

export const apiPut = <T>(endpoint: string, body: unknown, token?: string) =>
  api<T>(endpoint, { method: "PUT", body, token });

export const apiPatch = <T>(endpoint: string, body: unknown, token?: string) =>
  api<T>(endpoint, { method: "PATCH", body, token });

export const apiDelete = <T>(endpoint: string, token?: string) =>
  api<T>(endpoint, { method: "DELETE", token });

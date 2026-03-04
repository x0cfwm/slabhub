import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  // If host already contains protocol, use it. Otherwise, assume http for localhost, https otherwise.
  const protocol = host.includes('://') ? '' : (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http://' : 'https://');
  const fullUrl = `${protocol}${host}`;

  // Ensure it ends with a slash for proper relative URL joining
  return fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let errorMessage = text || res.statusText;

    try {
      const json = JSON.parse(text);
      if (json.message) {
        // NestJS often returns message as an array for validation errors
        errorMessage = Array.isArray(json.message) ? json.message[0] : json.message;
      } else if (json.error) {
        errorMessage = json.error;
      }
    } catch (e) {
      // Not JSON, use fallback text
    }

    throw new Error(errorMessage);
  }
}

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "slabhub_session_token";

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  // Remove leading slash from route to ensure it appends to the baseUrl path instead of replacing it
  const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
  const url = new URL(cleanRoute, baseUrl);

  const token = await getStoredToken();

  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const baseUrl = getApiUrl();
      const route = queryKey.join("/");
      const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
      const url = new URL(cleanRoute, baseUrl);

      const token = await getStoredToken();

      const res = await fetch(url.toString(), {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

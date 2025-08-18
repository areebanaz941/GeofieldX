import { QueryClient, QueryFunction } from "@tanstack/react-query";

// JWT Token management
let authToken: string | null = null;

// Initialize token from localStorage when available
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('auth_token');
}

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    try {
      localStorage.setItem('auth_token', token);
      console.log('[Auth] JWT token stored successfully');
    } catch (error) {
      console.error('[Auth] Failed to store JWT token:', error);
    }
  } else {
    try {
      localStorage.removeItem('auth_token');
      console.log('[Auth] JWT token removed from storage');
    } catch (error) {
      console.error('[Auth] Failed to remove JWT token:', error);
    }
  }
};

export const getAuthToken = () => authToken;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retries: number = 2
): Promise<Response> {
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  // Ensure we have the latest token from localStorage
  if (!authToken && typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token');
  }
  
  // Add JWT token if available
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use original fetch if available to avoid extension interference
      const fetchFn = (window as any).__originalFetch || fetch;
      
      const res = await fetchFn(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      await throwIfResNotOk(res);
      return res;
    } catch (error) {
      // Check if this might be extension interference
      if (error instanceof Error) {
        const stack = error.stack || '';
        if (stack.includes('knowee-ai') || stack.includes('extension://')) {
          console.warn('[Extension] API request may have been interfered with by extension:', error.message);
        }
      }
      
      // If this is the last attempt or it's not a network error, throw
      if (attempt === retries || (error instanceof Error && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_HTTP2_PROTOCOL_ERROR'))) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: HeadersInit = {};
    
    // Ensure we have the latest token from localStorage
    if (!authToken && typeof window !== 'undefined') {
      authToken = localStorage.getItem('auth_token');
    }
    
    // Add JWT token if available
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    // Use original fetch if available to avoid extension interference
    const fetchFn = (window as any).__originalFetch || fetch;
    
    const res = await fetchFn(queryKey[0] as string, {
      credentials: "include",
      headers,
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

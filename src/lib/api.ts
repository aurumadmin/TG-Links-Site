import { User, Link, AdFlyShortener, ClickLog, Withdrawal, SystemSettings, DashboardStats } from "../types";

export const CLOUD_RUN_BACKEND_URL = "https://ais-pre-ukvqji5iuxejucrz2sy234-853154883970.asia-southeast1.run.app";

export function getApiBase() {
  const savedBase = localStorage.getItem("tglinks_api_url");
  if (savedBase) {
    const clean = savedBase.endsWith("/") ? savedBase.slice(0, -1) : savedBase;
    return `${clean}/api`;
  }
  
  const envApi = (import.meta as any).env?.VITE_API_URL;
  if (envApi) {
    const clean = envApi.endsWith("/") ? envApi.slice(0, -1) : envApi;
    return `${clean}/api`;
  }

  // Auto-detect environment
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  
  // If running directly on local Node server or on Google Cloud Run container
  if (
    currentOrigin.includes("localhost") || 
    currentOrigin.includes("127.0.0.1") || 
    currentOrigin.includes("run.app")
  ) {
    return "/api";
  }
  
  // For custom domains (e.g., tglinks.eu.cc, thunder-appz.eu.org), Cloudflare Pages, Vercel, Netlify:
  // Connect directly to the active, live Cloud Run Node.js API backend!
  return `${CLOUD_RUN_BACKEND_URL}/api`;
}

export function setApiBaseUrl(url: string) {
  if (!url) {
    localStorage.removeItem("tglinks_api_url");
  } else {
    localStorage.setItem("tglinks_api_url", url);
  }
}

function getHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const userJson = localStorage.getItem("tglinks_user");
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        headers["Authorization"] = `Bearer ${user.id}`;
      }
    } catch (e) {
      console.error("Failed to parse auth user", e);
    }
  }
  return headers;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const cleanEndpoint = endpoint.startsWith("/api/") 
    ? endpoint.substring(4) 
    : (endpoint.startsWith("/") ? endpoint : `/${endpoint}`);

  const primaryBase = getApiBase();
  const url = `${primaryBase}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    
    // Check if the response returned an HTML document instead of JSON (e.g. static CDN 404/SPA fallback)
    if (contentType.includes("text/html") && !primaryBase.includes("run.app")) {
      console.warn(`[fetchApi] Received HTML from ${url}, falling back to Cloud Run backend...`);
      const fallbackUrl = `${CLOUD_RUN_BACKEND_URL}/api${cleanEndpoint}`;
      const fallbackRes = await fetch(fallbackUrl, {
        ...options,
        headers: {
          ...getHeaders(),
          ...options.headers,
        },
      });

      if (!fallbackRes.ok) {
        const errorData = await fallbackRes.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${fallbackRes.status}`);
      }
      return fallbackRes.json();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    // If network error occurred with relative or custom endpoint, attempt fallback to Cloud Run
    if (!primaryBase.includes("run.app")) {
      try {
        const fallbackUrl = `${CLOUD_RUN_BACKEND_URL}/api${cleanEndpoint}`;
        const fallbackRes = await fetch(fallbackUrl, {
          ...options,
          headers: {
            ...getHeaders(),
            ...options.headers,
          },
        });
        if (fallbackRes.ok) {
          return fallbackRes.json();
        }
      } catch (fallbackErr) {
        // Ignore fallback error and throw original error
      }
    }
    throw err;
  }
}

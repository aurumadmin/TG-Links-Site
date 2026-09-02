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

  // All modern deployments (Vercel, Cloud Run, custom domain, localhost) route /api seamlessly
  return "/api";
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

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

import { User, Link, AdFlyShortener, ClickLog, Withdrawal, SystemSettings, DashboardStats } from "../types";

export function getApiBase() {
  const savedBase = localStorage.getItem("tglinks_api_url");
  if (savedBase) {
    const clean = savedBase.endsWith("/") ? savedBase.slice(0, -1) : savedBase;
    return `${clean}/api`;
  }
  
  // Auto-detect environments
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  
  // If we are on local development or the direct Cloud Run instance, use relative /api or configured env
  if (
    currentOrigin.includes("localhost") || 
    currentOrigin.includes("127.0.0.1") || 
    currentOrigin.includes("run.app")
  ) {
    const baseUrl = (import.meta as any).env?.VITE_API_URL || "";
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/api`;
  }
  
  // Otherwise, we are deployed on Cloudflare Pages/Workers or a custom domain.
  // Automatically connect to the active, live Cloud Run server backend directly!
  const prodBackendUrl = "https://ais-pre-ukvqji5iuxejucrz2sy234-853154883970.asia-southeast1.run.app";
  return `${prodBackendUrl}/api`;
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
  const url = `${getApiBase()}${endpoint}`;
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

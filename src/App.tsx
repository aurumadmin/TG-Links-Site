import React, { useState, useEffect, useCallback } from "react";
import LandingPage from "./components/LandingPage";
import DashboardPage from "./components/DashboardPage";
import AdminPage from "./components/AdminPage";
import RedirectPage from "./components/RedirectPage";
import AuthPage from "./components/AuthPage";
import { User } from "./types";
import { fetchApi } from "./lib/api";
import { getCachedSettings, saveCachedSettings } from "./components/SiteLogo";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("tglinks_user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    return null;
  });

  const [activePage, setActivePage] = useState<string>("home"); // home, dashboard, admin, go
  const [activeTab, setActiveTab] = useState<string>("overview"); // tab within page
  const [shortCode, setShortCode] = useState<string>("");
  const [showAuth, setShowAuth] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(() => getCachedSettings());
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Apply site branding (favicon / title)
  const applyBranding = (settings: any) => {
    if (!settings) return;
    const iconUrl = settings.faviconUrl || settings.logoUrl;
    if (iconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = iconUrl;
    }
    if (settings.siteTitle || settings.siteName) {
      document.title = settings.siteTitle || settings.siteName || "TG Links";
    }
  };

  // 1. Load public site settings on mount
  useEffect(() => {
    // Immediately apply cached settings if present
    const cached = getCachedSettings();
    if (cached) {
      applyBranding(cached);
    }

    fetchApi("/settings")
      .then((res) => {
        if (!res) return;
        setSiteSettings(res);
        setIsSettingsLoaded(true);
        saveCachedSettings(res);
        applyBranding(res);
      })
      .catch((err) => {
        console.error("Error setting public site settings:", err);
        setIsSettingsLoaded(true);
      });
  }, []);

  // Parse path into state
  const parseRouteFromUrl = useCallback((pathName?: string) => {
    const path = pathName || window.location.pathname;

    // Check link redirection route: /go/:code
    const goMatch = path.match(/^\/go\/([a-zA-Z0-9_-]+)$/);
    if (goMatch) {
      const hostname = window.location.hostname;
      const isProd = !hostname.includes("localhost") && !hostname.includes("127.0.0.1") && !hostname.includes("ais-dev") && !hostname.includes("ais-pre");
      if (isProd && hostname !== "url.thunder-appz.eu.org") {
        window.location.replace(`https://url.thunder-appz.eu.org/go/${goMatch[1]}`);
        return;
      }
      setShortCode(goMatch[1]);
      setActivePage("go");
      setShowAuth(false);
      return;
    }

    // Check Admin routes
    if (path === "/admin" || path.startsWith("/admin/")) {
      const sub = path.replace(/^\/admin\/?/, "");
      let tab = "overview";
      if (sub === "users") tab = "users";
      else if (sub === "links") tab = "links";
      else if (sub === "withdrawals") tab = "withdrawals";
      else if (sub === "tickets") tab = "tickets";
      else if (sub === "settings") tab = "settings";
      else if (sub === "external" || sub === "external-apis") tab = "external";
      else if (sub === "views" || sub === "reports") tab = "views";

      setActivePage("admin");
      setActiveTab(tab);
      setShowAuth(false);
      return;
    }

    // Check Auth routes
    if (path === "/login" || path === "/register" || path === "/auth") {
      setShowAuth(true);
      return;
    }

    // Check User Dashboard routes: /dashboard, /dashboard/links, /links, /withdrawals, /tools, /api, /api-docs, /tickets, /profile, /settings-user
    if (
      path === "/dashboard" ||
      path.startsWith("/dashboard/") ||
      path === "/links" ||
      path === "/withdrawals" ||
      path === "/tools" ||
      path === "/api" ||
      path === "/api-docs" ||
      path === "/developer" ||
      path === "/tickets" ||
      path === "/profile"
    ) {
      let tab = "overview";
      if (path.includes("links")) tab = "links";
      else if (path.includes("withdraw")) tab = "withdraw";
      else if (path.includes("tools") || path === "/api" || path === "/api-docs" || path === "/developer") tab = "tools";
      else if (path.includes("ticket")) tab = "contact";
      else if (path.includes("setting") || path === "/profile") tab = "settings";

      setActivePage("dashboard");
      setActiveTab(tab);
      setShowAuth(false);
      return;
    }

    // Public Landing routes: /rates, /publisher-rates, /contact, /support, /privacy, /terms, /dmca
    let landingTab = "home";
    if (path === "/rates" || path === "/publisher-rates") landingTab = "rates";
    else if (path === "/contact" || path === "/support") landingTab = "contact";
    else if (path === "/privacy") landingTab = "privacy";
    else if (path === "/terms") landingTab = "terms";
    else if (path === "/dmca") landingTab = "dmca";

    setActivePage("home");
    setActiveTab(landingTab);
    setShowAuth(false);
  }, []);

  // Sync route on mount and popstate (browser back/forward)
  useEffect(() => {
    parseRouteFromUrl();

    const handlePopState = () => {
      parseRouteFromUrl();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [parseRouteFromUrl]);

  // Navigate helper with URL update
  const navigateTo = (targetPath: string) => {
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, "", targetPath);
    }
    parseRouteFromUrl(targetPath);
  };

  const handleAuthSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setShowAuth(false);
    navigateTo("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("tglinks_user");
    setUser(null);
    navigateTo("/");
  };

  const handleNavigate = (pageOrPath: string) => {
    if (pageOrPath === "home" || pageOrPath === "/") navigateTo("/");
    else if (pageOrPath === "dashboard") navigateTo("/dashboard");
    else if (pageOrPath === "admin") navigateTo("/admin");
    else if (pageOrPath === "login" || pageOrPath === "auth") {
      setShowAuth(true);
      if (window.location.pathname !== "/login") {
        window.history.pushState({}, "", "/login");
      }
    } else if (pageOrPath.startsWith("/")) {
      navigateTo(pageOrPath);
    } else {
      navigateTo(`/${pageOrPath}`);
    }
  };

  // Render Redirection Gate if viewing /go/:code
  if (activePage === "go" && shortCode) {
    return <RedirectPage code={shortCode} />;
  }

  // Auth Overlay page
  if (showAuth && !user) {
    return (
      <AuthPage 
        onAuthSuccess={handleAuthSuccess} 
        onClose={() => {
          setShowAuth(false);
          if (window.location.pathname === "/login" || window.location.pathname === "/register" || window.location.pathname === "/auth") {
            window.history.pushState({}, "", user ? "/dashboard" : "/");
          }
        }} 
      />
    );
  }

  // Dashboard Page Workspace
  if (activePage === "dashboard") {
    if (!user) {
      // Direct unauthenticated user to auth page at /login
      if (window.location.pathname !== "/login") {
        window.history.replaceState({}, "", "/login");
      }
      return (
        <AuthPage 
          onAuthSuccess={handleAuthSuccess} 
          onClose={() => navigateTo("/")} 
        />
      );
    }

    return (
      <DashboardPage 
        user={user} 
        initialTab={activeTab as any}
        onLogout={handleLogout} 
        onNavigate={handleNavigate} 
      />
    );
  }

  // Admin Portal Workspace
  if (activePage === "admin") {
    if (!user || user.role !== "admin") {
      // Redirect non-admins to dashboard or home
      if (window.location.pathname !== "/dashboard") {
        window.history.replaceState({}, "", user ? "/dashboard" : "/login");
      }
      return user ? (
        <DashboardPage 
          user={user} 
          initialTab="overview"
          onLogout={handleLogout} 
          onNavigate={handleNavigate} 
        />
      ) : (
        <AuthPage 
          onAuthSuccess={handleAuthSuccess} 
          onClose={() => navigateTo("/")} 
        />
      );
    }

    return (
      <AdminPage 
        initialTab={activeTab as any}
        onBackToDashboard={() => navigateTo("/dashboard")} 
      />
    );
  }

  // Default: Landing/Guest page
  return (
    <LandingPage 
      user={user} 
      initialTab={activeTab}
      siteSettings={siteSettings}
      isSettingsLoaded={isSettingsLoaded}
      onNavigate={handleNavigate} 
      onOpenAuth={() => {
        setShowAuth(true);
        if (window.location.pathname !== "/login") {
          window.history.pushState({}, "", "/login");
        }
      }} 
    />
  );
}

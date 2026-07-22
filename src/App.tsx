import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import DashboardPage from "./components/DashboardPage";
import AdminPage from "./components/AdminPage";
import RedirectPage from "./components/RedirectPage";
import AuthPage from "./components/AuthPage";
import { User } from "./types";
import { fetchApi } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<string>("home"); // home, dashboard, admin, go
  const [shortCode, setShortCode] = useState<string>("");
  const [showAuth, setShowAuth] = useState(false);

  // 1. Path routing check and site settings (favicon/title) load
  useEffect(() => {
    fetchApi("/settings")
      .then((res) => {
        if (!res) return;
        const iconUrl = res.faviconUrl || res.logoUrl;
        if (iconUrl) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = iconUrl;
        }
        if (res.siteTitle || res.siteName) {
          document.title = res.siteTitle || res.siteName || "TG Links";
        }
      })
      .catch((err) => console.error("Error setting public site settings:", err));

    const path = window.location.pathname;
    // Format: /go/xyz123
    const goMatch = path.match(/^\/go\/([a-zA-Z0-9]+)$/);
    if (goMatch) {
      const hostname = window.location.hostname;
      const isProd = !hostname.includes("localhost") && !hostname.includes("127.0.0.1") && !hostname.includes("ais-dev") && !hostname.includes("ais-pre");
      if (isProd && hostname !== "url.thunder-appz.eu.org") {
        window.location.replace(`https://url.thunder-appz.eu.org/go/${goMatch[1]}`);
        return;
      }
      setShortCode(goMatch[1]);
      setActivePage("go");
    } else {
      // Normal routing: check logged in session
      const storedUser = localStorage.getItem("tglinks_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setActivePage("dashboard");
        } catch (e) {
          console.error("Failed to parse stored user", e);
        }
      }
    }
  }, []);

  const handleAuthSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setShowAuth(false);
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("tglinks_user");
    setUser(null);
    setActivePage("home");
  };

  // Switch workspace pages
  const handleNavigate = (page: string) => {
    setActivePage(page);
    setShowAuth(false);
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
        onClose={() => setShowAuth(false)} 
      />
    );
  }

  // Dashboard Page Workspace
  if (activePage === "dashboard" && user) {
    return (
      <DashboardPage 
        user={user} 
        onLogout={handleLogout} 
        onNavigate={handleNavigate} 
      />
    );
  }

  // Admin Portal Workspace
  if (activePage === "admin" && user && user.role === "admin") {
    return (
      <AdminPage 
        onBackToDashboard={() => setActivePage("dashboard")} 
      />
    );
  }

  // Default: Landing/Guest page
  return (
    <LandingPage 
      user={user} 
      onNavigate={handleNavigate} 
      onOpenAuth={() => setShowAuth(true)} 
    />
  );
}
